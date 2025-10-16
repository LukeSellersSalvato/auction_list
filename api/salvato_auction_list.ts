/// <reference path="../types/types.d.ts" />

import { createAuctionPdfFromData } from "../functions/auction-pdf-pipe.js";
import { uploadPdfsToDropbox } from "../functions/dropbox-uploader.js";
import * as fs from 'fs';

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
}

async function fetchSalvatoToken(apiUrl: string): Promise<SalvatoToken> {
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

    const data = (await response.json()) as SalvatoToken
    return data
}

async function fetchSalvatoAuctionList(apiUrl: string, apiToken: string): Promise<AuctionData> {
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

    const data = (await response.json()) as AuctionData
    return data
}

async function fetchSalvatoAuctionLotList(apiUrl: string, apiToken: string): Promise<AuctionStock[]> {
    let allLots: AuctionStock[] = []
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
        allLots.push(...data.data as AuctionStock[])
        offset += limit
        hasMore = data.pagination.total > allLots.length
    }

    return allLots as AuctionStock[]
}

async function transformAuctionList(auctionList: AuctionStock[]): Promise<FormattedAuctionData> {
    const vehicles: FormattedAuctionStock[] = auctionList.map(lot => ({
        id: lot.id,
        make: lot.make,
        model: lot.model,
        year: lot.year,
        city: lot.city,
        state: lot.state,
        odometerReading: lot.odometerReading,
        startCode: lot.startCode,
        hasKeys: lot.hasKeys,
        thumbnailUrl: lot.lotImagesDetails.lotImages[0].link[0].url,
    }))

    const startDate = auctionList.length > 0 ? auctionList[0]!.startDate : '';
    const endDate = auctionList.length > 0 ? auctionList[0]!.endDate : '';

    const payload: FormattedAuctionData = {
        data: vehicles,
        startDate: startDate,
        endDate: endDate,
    }

    return payload
}

export default async function handler(request: Request): Promise<Response> {

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const token = await fetchSalvatoToken(`${process.env.SALVATO_PRODUCTION_URL}/auth/token`)
    const auctionList = await fetchSalvatoAuctionList(`${process.env.SALVATO_PRODUCTION_URL}/auctions`, token.token)
    const lotsByAuction = new Map<string, AuctionStock[]>();
    for (const auction of auctionList.data) {
        if (auction.status === 'COMING_SOON') {
            const auctionLotList = await fetchSalvatoAuctionLotList(`${process.env.SALVATO_PRODUCTION_URL}/auctions/${auction.auctionId}/lots`, token.token)
            lotsByAuction.set(String(auction.auctionId), auctionLotList)
        } else if (auction.status === 'IN_PROGRESS') {
            const auctionLotList = await fetchSalvatoAuctionLotList(`${process.env.SALVATO_PRODUCTION_URL}/auctions/${auction.auctionId}/lots`, token.token)
            lotsByAuction.set(String(auction.auctionId), auctionLotList)
            continue;
        } else if (auction.status === 'COMPLETED') {
            continue;
        } else if (auction.status === 'CANCELLED') {
            continue;
        }
    }

    const payloads: FormattedAuctionData[] = []
    for (const [, lots] of lotsByAuction.entries()) {
        const payload = await transformAuctionList(lots)
        payloads.push(payload)
    }

    // iterate over payloads and build pdf in parallel
    const pdfPaths = await Promise.all(payloads.map(payload => createAuctionPdfFromData(payload, undefined, './templates/auction_list_template.html')))

    // Upload PDFs to Dropbox
    const dropboxAccessToken = process.env.DROPBOX_ACCESS_TOKEN;
    if (!dropboxAccessToken) {
      throw new Error('DROPBOX_ACCESS_TOKEN environment variable is not set');
    }

    const dropboxFolder = process.env.DROPBOX_FOLDER || '/Salvato/Auction Lists';
    const uploadResults = await uploadPdfsToDropbox(pdfPaths, dropboxFolder, dropboxAccessToken);

    // Clean up local PDF files
    pdfPaths.forEach(pdfPath => {
      try {
        fs.unlinkSync(pdfPath);
      } catch (error) {
        console.error(`Failed to delete ${pdfPath}:`, error);
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        pdfCount: uploadResults.length,
        pdfs: uploadResults.map(result => ({
          name: result.name,
          path: result.path,
          downloadUrl: result.sharedLink,
        })),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}


