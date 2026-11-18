import { useState } from 'react';
import { Download } from 'lucide-react';
import Swal from 'sweetalert2';
import API from '@/api/axios';
import { getApiError } from '@/api/errors';

const extensions = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg' };

export default function DownloadNidScan({ endpoint }) {
    const [downloading, setDownloading] = useState(false);

    async function downloadScan() {
        setDownloading(true);
        try {
            const { data } = await API.get(`${endpoint}nid-scan/`, { responseType: 'blob' });
            const url = URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `nid-scan.${extensions[data.type] || 'bin'}`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Could not download scan', text: getApiError(error, 'Please try again.') });
        } finally {
            setDownloading(false);
        }
    }

    return (
        <button type="button" disabled={downloading} onClick={downloadScan} className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline disabled:opacity-60">
            <Download aria-hidden="true" className="size-4" />
            {downloading ? 'Downloading…' : 'Download current scan'}
        </button>
    );
}
