/// <reference path="../types/types.d.ts" />

import { Dropbox } from 'dropbox';
import * as fs from 'fs';

export interface DropboxUploadResult {
  name: string;
  path: string;
  sharedLink: string;
}

/**
 * Uploads a file to Dropbox and returns a shared link
 */
export async function uploadToDropbox(
  filePath: string,
  dropboxPath: string,
  accessToken: string
): Promise<DropboxUploadResult> {
  const dbx = new Dropbox({ accessToken });

  // Read the file
  const fileContent = fs.readFileSync(filePath);

  // Upload the file
  const uploadResponse = await dbx.filesUpload({
    path: dropboxPath,
    contents: fileContent,
    mode: { '.tag': 'overwrite' }, // Overwrite if exists
    autorename: false,
    mute: false,
  });

  // Create a shared link
  let sharedLink: string;
  try {
    // Try to create a new shared link
    const linkResponse = await dbx.sharingCreateSharedLinkWithSettings({
      path: dropboxPath,
      settings: {
        requested_visibility: { '.tag': 'public' },
      },
    });
    sharedLink = linkResponse.result.url;
  } catch (error: any) {
    // If link already exists, get the existing link
    if (error?.error?.error['.tag'] === 'shared_link_already_exists') {
      const existingLinks = await dbx.sharingListSharedLinks({
        path: dropboxPath,
      });
      if (existingLinks.result.links.length > 0) {
        sharedLink = existingLinks.result.links[0].url;
      } else {
        throw new Error('Failed to get shared link');
      }
    } else {
      throw error;
    }
  }

  // Convert www.dropbox.com to dl.dropboxusercontent.com for direct download
  const directLink = sharedLink.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '');

  return {
    name: uploadResponse.result.name,
    path: uploadResponse.result.path_display || dropboxPath,
    sharedLink: directLink,
  };
}

/**
 * Uploads multiple PDF files to Dropbox
 */
export async function uploadPdfsToDropbox(
  pdfPaths: string[],
  dropboxFolder: string,
  accessToken: string
): Promise<DropboxUploadResult[]> {
  const uploadPromises = pdfPaths.map(async (pdfPath, index) => {
    const fileName = pdfPath.split('/').pop() || `auction_list_${index}.pdf`;
    const dropboxPath = `${dropboxFolder}/${fileName}`;
    return uploadToDropbox(pdfPath, dropboxPath, accessToken);
  });

  return Promise.all(uploadPromises);
}

