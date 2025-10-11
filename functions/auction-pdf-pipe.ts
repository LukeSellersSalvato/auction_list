import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

// 1) Load HTML template
export function loadTemplate(templatePath?: string): string {
    const filePath = templatePath || path.join(__dirname, 'auction_list_enhanced.html');
    return fs.readFileSync(filePath, 'utf-8');
}

// 2) Inject data into template (server-side rendering of rows)
export function renderHtml(templateHtml: string, auctionData: FormattedAuctionData): string {
    // Build table rows HTML
    const rowsHtml = auctionData.data.map((item, index) => {
        const imageUrl = item.thumbnailUrl || 'https://res.cloudinary.com/drydbxfl8/image/upload/v1758651858/Salvato_Auctions_Logo_Full_Color_Dark_dyltjs.png';
        const keysDisplay = item.hasKeys === 'YES' ? 'Yes' : 'No';
        const mileageDisplay = typeof item.odometerReading === 'number' ? item.odometerReading.toLocaleString() : 'N/A';
        const startCodeDisplay = item.startCode && item.startCode.length > 20 ? `${item.startCode.substring(0, 17)}...` : item.startCode;

        // Each row is marked as avoid-break to prevent page-break inside rows
        // Add border except on the last item
        const borderClass = index < auctionData.data.length - 1 ? ' border-b border-black' : '';

        return `
            <tr class="avoid-break${borderClass}">
                <td class="border-r border-black p-3 col-image"><img src="${imageUrl}" alt="${item.make} ${item.model}" class="max-w-full max-h-20 object-cover"></td>
                <td class="border-r border-black p-3 text-blue-600 hover:text-blue-800 underline col-stock"><a href="https://salvatoauctions.com/vehicle-details/${item.id}" target="_blank" rel="noopener noreferrer">${item.id}</a></td>
                <td class="border-r border-black p-3 col-year">${item.year}</td>
                <td class="border-r border-black p-3 col-make">${item.make}</td>
                <td class="border-r border-black p-3 col-model">${item.model}</td>
                <td class="border-r border-black p-3 col-mileage">${mileageDisplay}</td>
                <td class="border-r border-black p-3 col-city">${item.city}</td>
                <td class="border-r border-black p-3 col-state">${item.state}</td>
                <td class="border-r border-black p-3 col-keys">${keysDisplay}</td>
                <td class="border-r border-black p-3 col-start-code">${startCodeDisplay}</td>
            </tr>
        `;
    }).join('');

    // Replace the tbody content between the opening and closing tags
    const tbodyOpenTag = '<tbody id="auction-table-body">';
    const tbodyCloseTag = '</tbody>';

    const startIdx = templateHtml.indexOf(tbodyOpenTag);
    if (startIdx === -1) {
        throw new Error('Could not find <tbody id="auction-table-body"> in template.');
    }
    const afterOpenIdx = startIdx + tbodyOpenTag.length;
    const endIdx = templateHtml.indexOf(tbodyCloseTag, afterOpenIdx);
    if (endIdx === -1) {
        throw new Error('Could not find closing </tbody> in template.');
    }

    let rendered = templateHtml.slice(0, afterOpenIdx) + `\n${rowsHtml}\n` + templateHtml.slice(endIdx);

    // Remove the inline script block at the end (client-side population) to avoid duplication
    // Keep the Tailwind CDN <script src=...> in <head> intact
    rendered = rendered.replace(/<script>[\s\S]*?<\/script>\s*<\/body>/, '</body>');

    // Ensure print CSS for PDF is present (already in template). We keep it as-is.
    return rendered;
}

// 3) Generate A3 PDF from HTML
export async function generateA3PdfFromHtml(html: string, outputPath: string): Promise<void> {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.setContent(html, { waitUntil: 'load' });
        // Allow images to load
        await new Promise(resolve => setTimeout(resolve, 2500));

        await page.pdf({
            path: outputPath,
            format: 'A3',
            landscape: true,
            margin: {
                top: '1in',
                right: '0.5in',
                bottom: '1in',
                left: '0.5in'
            },
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: `
                <div style="font-size: 12px; text-align: center; width: 100%; color: #333; font-weight: bold;">
                    SALVATO AUCTIONS - AUCTION LIST
                </div>
            `,
            footerTemplate: `
                <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
                    Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                </div>
            `
        });
    } finally {
        await page.close();
        await browser.close();
    }
}

// 4) Pipeline helpers
export async function createAuctionPdfFromData(
    data: FormattedAuctionData,
    outputPath?: string,
    templatePath?: string
): Promise<string> {
    const htmlTemplate = loadTemplate(templatePath);
    const html = renderHtml(htmlTemplate, data);
    const output = outputPath || path.join(__dirname, `auction_list_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`);
    await generateA3PdfFromHtml(html, output);
    return output;
}

export async function createAuctionPdfFromJson(
    jsonPath: string,
    outputPath?: string,
    templatePath?: string
): Promise<string> {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const data: FormattedAuctionData = JSON.parse(raw);
    return await createAuctionPdfFromData(data, outputPath, templatePath);
}



