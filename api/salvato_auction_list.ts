export const config = {
  runtime: 'edge',
}

type SalvatoTokenReqBody = {
    clientId: string,
    clientSecret: string,
}

type SalvatoTokenResBody = {
    token: string,
    expiresIn: number,
}

type SalvatoAuction = {
    auctionId: string,
    name: string,
    createdAt: string,
    updatedAt: string,
    status: string,
}

type SalvatoAuctionResBody = {
    auctions: SalvatoAuction[],
    total: number,
}

type SalvatoAuctionLot = {
    id: number
    lotUrl: string
    auctionId: number
    status: 'IN_PROGRESS' | 'COMING_SOON' | 'COMPLETED' | 'CANCELLED'
    startDate: string
    endDate: string
    zipCode: string
    state: string
    city: string
    currentPrice: number
    vin: string
    year: number
    make: string
    model: string
    color: string
    odometerReading: number
    odometerReadingType: 'ACTUAL' | 'EXEMPT' | 'NOT_ACTUAL'
    actualCashValue: number
    estimatedCostOfRepair: number
    titleBrands: string[]
    title: {
      brand: string
      name: string
      description: string
    }
    transmissionStyle: 'AUTOMATIC' | 'MANUAL' | 'CVT'
    driveType: 'FWD' | 'RWD' | 'AWD' | '4WD'
    fuelType: 'GASOLINE' | 'DIESEL' | 'ELECTRIC' | 'HYBRID'
    engineHp: number
    engineNumberOfCylinders: number
    engineDisplacementLiters: number
    airbagsDeployed: 'YES' | 'NO' | 'UNKNOWN'
    startCode: 'RUNS_AND_DRIVES' | 'RUNS_BUT_NEEDS_REPAIR' | 'WILL_NOT_START'
    hasKeys: 'YES' | 'NO' | 'UNKNOWN'
    damageType: 'COLLISION_IMPACT' | 'FIRE' | 'FLOOD' | 'HAIL' | 'THEFT'
    primaryDamage: 'FRONT' | 'REAR' | 'LEFT' | 'RIGHT' | 'TOP' | 'UNDERCARRIAGE'
    secondaryDamage: string
    lotImagesDetails: {
      imgCount: number
      lotImages: {
        sequence: number
        category: string
        link: {
          url: string
          isThumbNail: boolean
          isHdImage: boolean
        }[]
      }[]
    }
    videoURL?: string
  }

  type PlumsailAuctionVehicleObject = {
    lotId: number;
    make: string;
    model: string;
    year: number;
    urlLink: string;
  }
  
  // Type for the full request payload
  type PlumsailAuctionVehicleRequest = {
    vehicle: PlumsailAuctionVehicleObject[];
    auctionStartDate: string;
    auctionEndDate: string;
  }
  
  type SalvatoAuctionLotResBody = {
    data: SalvatoAuctionLot[]
    pagination: {
      limit: number
      offset: number
      total: number
    }
  }


async function fetchSalvatoToken(apiUrl: string): Promise<SalvatoTokenResBody> {
    const response = await fetch(apiUrl, {
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientId: process.env.SALVATO_CLIENT_ID, clientSecret: process.env.SALVATO_CLIENT_SECRET }),
    })

    if (!response.ok) {
        throw new Error(`Salvato API failed: ${response.status}`)
    }

    const data = (await response.json()) as SalvatoTokenResBody
    return data
}

async function fetchSalvatoAuctionList(apiUrl: string, apiToken: string): Promise<SalvatoAuctionResBody> {
    const response = await fetch(apiUrl, {
        headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
        },
    })

    if (!response.ok) {
        throw new Error(`Salvato API failed: ${response.status}`)
    }

    const data = (await response.json()) as SalvatoAuctionResBody
    return data
}

async function fetchSalvatoAuctionLotList(apiUrl: string, apiToken: string): Promise<SalvatoAuctionLotResBody> {
    const response = await fetch(apiUrl, {
        headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
        },
    })

    if (!response.ok) {
        throw new Error(`Salvato API failed: ${response.status}`)
    }

    const data = (await response.json()) as SalvatoAuctionLotResBody
    return data
}

async function transformAuctionList(auctionList: SalvatoAuctionLot[]): Promise<PlumsailAuctionVehicleRequest> {
    const vehicles: PlumsailAuctionVehicleObject[] = auctionList.map(lot => ({
        lotId: lot.id,
        make: lot.make,
        model: lot.model,
        year: lot.year,
        urlLink: lot.lotUrl,
    }))

    const startDate = auctionList.length > 0 ? auctionList[0]!.startDate : '';
    const endDate = auctionList.length > 0 ? auctionList[0]!.endDate : '';

    const payload: PlumsailAuctionVehicleRequest = {
        vehicle: vehicles,
        auctionStartDate: startDate,
        auctionEndDate: endDate,
    }

    return payload
}



export default async function handler(request: Request): Promise<Response> {
  try {

    const token = await fetchSalvatoToken(`${process.env.SALVATO_STAGING_URL}/token`)
    const auctionList = await fetchSalvatoAuctionList(`${process.env.SALVATO_STAGING_URL}/auctions`, token.token)
    
    const lotsByAuction = new Map<string, SalvatoAuctionLot[]>();
    for (const auction of auctionList.auctions) {
        if (auction.status === 'COMING_SOON') {
            const auctionLotList = await fetchSalvatoAuctionLotList(`${process.env.SALVATO_STAGING_URL}/auctions/${auction.auctionId}/lots`, token.token)
            lotsByAuction.set(String(auction.auctionId), auctionLotList.data)
        } else if (auction.status === 'IN_PROGRESS') {
            continue;
        } else if (auction.status === 'COMPLETED') {
            continue;
        } else if (auction.status === 'CANCELLED') {
            continue;
        }
    }

    const payloads: PlumsailAuctionVehicleRequest[] = []
    for (const [, lots] of lotsByAuction.entries()) {
        const payload = await transformAuctionList(lots)
        payloads.push(payload)
    }

    // send to Plumsail per auction in parallel
    const plumsailResponses = await Promise.all(payloads.map(payload =>
      fetch(`${process.env.PLUMSAIL_API_URL}/processes/ogvoprmt/sgwreaq/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    ))
    const firstError = plumsailResponses.find(r => !r.ok)
    if (firstError) {
      throw new Error(`Plumsail API failed: ${firstError.status}`)
    }
    const plumsailData = await Promise.all(plumsailResponses.map(r => r.json()))
    console.log(plumsailData)

    return new Response(
      JSON.stringify({
        success: true,
        data: plumsailData,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}


