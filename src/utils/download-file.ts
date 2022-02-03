import Axios from 'axios';
import * as fs from 'fs';

/**
 * Download a file and store it in a defined location
 * @param fileUrl
 * @param outputLocationPath
 * @returns promise
 */
export async function downloadFile(fileUrl: string, outputLocationPath: string) {
  const id = uuid();
  const tempfile = outputLocationPath + id;
  const writer = fs.createWriteStream(tempfile);
  return Axios({
    method: 'get',
    url: fileUrl,
    responseType: 'stream',
  }).then((response) => {
    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      let error: Error;
      writer.on('error', (err: Error) => {
        error = err;
        writer.close();
        reject(err);
      });

      writer.on('close', () => {
        if (!error) {
          fs.renameSync(tempfile, tempfile.replace(id, ''));
          resolve(true);
        }
      });
    });
  });
}

/**
 *
 * @returns uuid string
 */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
