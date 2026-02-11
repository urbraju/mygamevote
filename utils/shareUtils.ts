import { WeeklySlotData } from '../services/votingService';

export const generateWhatsAppLink = (data: WeeklySlotData): string => {
    const { slots, maxSlots, votingOpensAt } = data;

    // Format Date
    const gameDate = votingOpensAt ? new Date(votingOpensAt).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    }) : 'Upcoming Game';

    let message = `\uD83C\uDFD0 *VolleyBall confirmed players for ${gameDate} at Courts At Craig Ranch* \uD83C\uDFD0\n\n`;

    const formatTime = (ts: any) => {
        // Handle Firestore Timestamp or number
        const millis = typeof ts === 'object' && ts.toMillis ? ts.toMillis() : ts;
        const d = new Date(millis);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
    };

    // Confirmed List
    const confirmed = slots.filter(s => s.status === 'confirmed');
    message += `\uD83C\uDFD0 *Confirmed (${confirmed.length}/${maxSlots}):*\n`;
    if (confirmed.length > 0) {
        confirmed.forEach((s, index) => {
            message += `${index + 1}. ${s.userName} - ${formatTime(s.timestamp)}\n`;
        });
    } else {
        message += `(None yet)\n`;
    }

    // Waitlist
    const waitlist = slots.filter(s => s.status === 'waitlist');
    if (waitlist.length > 0) {
        message += `\n\uD83C\uDFD0 *Waitlist:*\n`;
        waitlist.forEach((s, index) => {
            message += `${index + 1}. ${s.userName} - ${formatTime(s.timestamp)}\n`;
        });
    }

    message += `\n🔗 *Join here:* https://vbmastigameslot.web.app/`;

    // Encode for URL - using api.whatsapp.com for better compatibility
    let url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    if (data.adminPhoneNumber) {
        // Strip non-numeric characters just in case, though usually manual input
        const phone = data.adminPhoneNumber.replace(/\D/g, '');
        url += `&phone=${phone}`;
    }

    return url;
};
