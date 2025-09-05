export const config = {
  runtime: 'edge',
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
    data: SalvatoAuction[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
    };
  };
  

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
  }


async function fetchSalvatoToken(apiUrl: string): Promise<SalvatoTokenResBody> {
    console.log(`Fetching Salvato token from ${apiUrl}`)
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientId: process.env.SALVATO_CLIENT_ID, clientSecret: process.env.SALVATO_CLIENT_SECRET }),
    })

    if (!response.ok) {
        throw new Error(`Salvato API failed: ${response.status}`)
    }

    const data = (await response.json()) as SalvatoTokenResBody
    console.log(`Salvato token fetched: ${data.token}`)
    return data
}

async function fetchSalvatoAuctionList(apiUrl: string, apiToken: string): Promise<SalvatoAuctionResBody> {
    console.log(`Fetching Salvato auction list from ${apiUrl}`)
    const response = await fetch(apiUrl, {
        method: 'GET',
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
    console.log(`Fetching Salvato auction lot list from ${apiUrl}`)
    let allLots: SalvatoAuctionLot[] = []
    let offset = 0
    let hasMore = true
    const limit = 10 // Assuming API default or max limit

    while (hasMore) {
        const response = await fetch(`${apiUrl}?offset=${offset}&limit=${limit}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(`Salvato API failed: ${response.status}`)
        }

        const data = (await response.json())
        allLots.push(...data.data as SalvatoAuctionLot[])
        offset += limit
        hasMore = data.pagination.total > allLots.length
    }

    return {
        data: allLots as SalvatoAuctionLot[],
    }
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

    console.log(`Auction list transformed: ${payload.vehicle.length} vehicles`)
    return payload
}



export default async function handler(request: Request): Promise<Response> {
    console.log('Plumsail API Key: ', process.env.PLUMSAIL_API_KEY)
    console.log('Plumsail API URL: ', process.env.PLUMSAIL_API_URL)
    console.log('Salvato API URL: ', process.env.SALVATO_PRODUCTION_URL)
    console.log('Salvato Client ID: ', process.env.SALVATO_CLIENT_ID)
    console.log('Salvato Client Secret: ', process.env.SALVATO_CLIENT_SECRET)
  try {
    const token = await fetchSalvatoToken(`${process.env.SALVATO_PRODUCTION_URL}/auth/token`)
    const auctionList = await fetchSalvatoAuctionList(`${process.env.SALVATO_PRODUCTION_URL}/auctions`, token.token)
    
    const lotsByAuction = new Map<string, SalvatoAuctionLot[]>();
    for (const auction of auctionList.data) {
        if (auction.status === 'COMING_SOON') {
            const auctionLotList = await fetchSalvatoAuctionLotList(`${process.env.SALVATO_PRODUCTION_URL}/auctions/${auction.auctionId}/lots`, token.token)
            console.log(`Salvato auction lot list fetched: ${auctionLotList.data.length} lots`)
            lotsByAuction.set(String(auction.auctionId), auctionLotList.data)
        } else if (auction.status === 'IN_PROGRESS') {
            const auctionLotList = await fetchSalvatoAuctionLotList(`${process.env.SALVATO_PRODUCTION_URL}/auctions/${auction.auctionId}/lots`, token.token)
            console.log(`Salvato auction lot list fetched: ${auctionLotList.data.length} lots`)
            lotsByAuction.set(String(auction.auctionId), auctionLotList.data)
            continue;
        } else if (auction.status === 'COMPLETED') {
            console.log(`Skipping completed auction: ${auction.auctionId}`)
            continue;
        } else if (auction.status === 'CANCELLED') {
            console.log(`Skipping cancelled auction: ${auction.auctionId}`)
            continue;
        }
    }

    const payloads: PlumsailAuctionVehicleRequest[] = []
    for (const [, lots] of lotsByAuction.entries()) {
        const payload = await transformAuctionList(lots)
        console.log(`Auction list transformed: ${payload.vehicle.length} vehicles`)
        payloads.push(payload)
    }

    // send to Plumsail per auction in parallel
    const plumsailResponses = await Promise.all(payloads.map(payload =>
      fetch(`${process.env.PLUMSAIL_API_URL}/processes/ogvoprmt/sgwreaq/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${process.env.PLUMSAIL_API_KEY}`,
        },
        body: JSON.stringify(payload),
      })
    ))
    const firstError = plumsailResponses.find(r => !r.ok)
    if (firstError) {
      throw new Error(`Plumsail API failed: ${firstError.status}`)
    }
    const plumsailData = await Promise.all(plumsailResponses.map(r => r.json()))
    console.log(`Plumsail data fetched: ${plumsailData.length} auctions`)

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


