/**
 * Share Utilities
 * 
 * Generates shareable WhatsApp messages with the confirmed player list.
 * Used by the Admin panel for quick sharing of game rosters.
 * 
 * Key Function:
 * - generateWhatsAppLink: Creates a pre-formatted WhatsApp message with
 *   confirmed players, waitlist, and join link.
 */
import { WeeklySlotData } from '../services/votingService';
import { getMillis } from './dateUtils';

export const generateWhatsAppLink = (data: any): string => {
    const { slots, maxSlots, votingOpensAt, eventDate, sportName } = data;

    // Use eventDate if available (new system), otherwise use votingOpensAt (legacy)
    const targetDate = eventDate || votingOpensAt;
    const gameDate = targetDate ? new Date(getMillis(targetDate)).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    }) : 'Upcoming Game';

    let message = `🏐 *${sportName || 'VolleyBall'} confirmed players for ${gameDate} at ${data.location || 'Beach at Craig Ranch'}* 🏐\n\n`;

    const formatTime = (ts: any) => {
        // Handle Firestore Timestamp or number
        const millis = typeof ts === 'object' && ts.toMillis ? ts.toMillis() : ts;
        const d = new Date(millis);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
    };

    // Confirmed List - Always show exactly 14 (or maxSlots)
    const confirmedSlots = (slots || [])
        .filter((s: any) => s.status === 'confirmed')
        .sort((a: any, b: any) => getMillis(a.timestamp) - getMillis(b.timestamp));

    const limitSlots = maxSlots || 14;
    message += `🏐 *Confirmed (${confirmedSlots.length}/${limitSlots}):*\n`;

    for (let i = 0; i < limitSlots; i++) {
        const s = confirmedSlots[i];
        if (s) {
            message += `${i + 1}. ${s.userName} - ${formatTime(s.timestamp)}\n`;
        } else {
            message += `${i + 1}. [Open Slot]\n`;
        }
    }

    // Waitlist - Only show if exists
    const waitlistSlots = (slots || [])
        .filter((s: any) => s.status === 'waitlist')
        .sort((a: any, b: any) => getMillis(a.timestamp) - getMillis(b.timestamp));

    if (waitlistSlots.length > 0) {
        message += `\n🏐 *Waitlist:*\n`;
        waitlistSlots.forEach((s: any, index: number) => {
            message += `${index + 1}. ${s.userName} - ${formatTime(s.timestamp)}\n`;
        });
    }

    message += `\n🔗 *Join here:* https://mygamevote.com/`;

    // Encode for URL - using api.whatsapp.com for better compatibility
    let url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    if (data.adminPhoneNumber) {
        // Strip non-numeric characters just in case, though usually manual input
        const phone = data.adminPhoneNumber.replace(/\D/g, '');
        url += `&phone=${phone}`;
    }

    return url;
};

export const generateTeamsWhatsAppLink = (teams: any, slots: any[], metaData: any): string => {
    const { sportName, location } = metaData;

    let message = `🏐 *GAME: TEAM ASSIGNMENTS* 🏐\n\n`;
    message += `📍 *Location:* ${location}\n`;
    message += `🏃‍♂️ *Sport:* ${sportName}\n`;
    message += `--------------------------\n\n`;

    message += `🔵 *TEAM BLUE*\n`;
    teams.teamA.forEach((uid: string, index: number) => {
        const p = slots.find((s: any) => s.userId === uid);
        message += `${index + 1}. ${p ? p.userName : 'Player'}\n`;
    });

    message += `\n🔴 *TEAM RED*\n`;
    teams.teamB.forEach((uid: string, index: number) => {
        const p = slots.find((s: any) => s.userId === uid);
        message += `${index + 1}. ${p ? p.userName : 'Player'}\n`;
    });

    message += `\nSee you on the field! ⚡`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};
