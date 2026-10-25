import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Turns an HTML page into a PDF and opens the share sheet (phone) or print dialog (web) */
export async function sharePdf(html: string, title: string) {
  if (Platform.OS === 'web') {
    // Print from a hidden frame (no pop-up needed); the browser's print dialog offers "Save as PDF"
    document.getElementById('print-frame')?.remove();
    const frame = document.createElement('iframe');
    frame.id = 'print-frame';
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(frame);
    const doc = frame.contentWindow!.document;
    doc.open();
    doc.write(html);
    doc.close();
    await new Promise((r) => setTimeout(r, 300));
    frame.contentWindow!.focus();
    frame.contentWindow!.print();
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: title });
  } else {
    await Print.printAsync({ uri });
  }
}
