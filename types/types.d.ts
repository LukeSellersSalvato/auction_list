declare global {
  interface SalvatoToken {
    token: string;
    expiresIn: number;
  }

  interface AuctionStock {
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
    videoURL?: string;
  }

  interface AuctionData {
    data: AuctionStock[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
    };
  }

  interface FormattedAuctionStock {
    id: number;
    make: string;
    model: string;
    year: number;
    city: string;
    state: string;
    odometerReading: number | null;
    startCode: string;
    hasKeys: string;
    thumbnailUrl: string | null;
  }

  interface FormattedAuctionData {
    data: FormattedAuctionStock[];
    startDate: string;
    endDate: string;
  }
}

export {}

