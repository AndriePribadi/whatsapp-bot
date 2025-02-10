const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const https = require('https');
const express = require('express');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.status(200).send('Bot is running'));
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));

const agent = new https.Agent({ rejectUnauthorized: false });
const userStates = {};
const client = new Client({ authStrategy: new LocalAuth() });

client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('✅ Bot WhatsApp siap digunakan!'));

const API_BASE_URL = "https://mrpribadi.com/home/Include/API";

const getGreeting = () => {
    const hour = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false });
    const hourInt = parseInt(hour, 10);
    if (hourInt >= 4 && hourInt < 11) return "Shalom dan selamat pagi! 🌞";
    if (hourInt >= 11 && hourInt < 15) return "Shalom dan selamat siang! ☀️";
    if (hourInt >= 15 && hourInt < 19) return "Shalom dan selamat sore! 🌅";
    return "Shalom dan selamat malam! 🌙";
};

client.on('message', async (message) => {
    const { from, body } = message;
    const text = body.toLowerCase().trim();
    const adminNumber = '628119320402@c.us';

    // 🔹 Bersihkan nomor agar hanya angka (tanpa @c.us)
    const userPhoneNumber = from.replace('@c.us', '');

    // if (text === '/cancel' && userStates[from]) {
    //     delete userStates[from];
    //     await client.sendMessage(from, '🚫 *Oke, proses sudah kami batalkan.* \n🙋🏻‍♂️ Terima kasih dan sampai ketemu lagi.');
    //     return;
    // }

    if (text === '/hi' || text === '/info') {
        const greeting = getGreeting();
        await client.sendMessage(from, `🙋🏻‍♂️ Hi .. ${greeting} \n\n` +
            `📌 *Terima kasih sudah terhubung dengan kami, kata kunci yang tersedia saat ini :*\n` +
            `* */hi* atau */info* → Memulai percakapan dan melihat command apa yang tersedia.\n` +
            `* */event* → Melihat informasi kegiatan.\n` +
            `* */absensi* → Melihat persentase kehadiran doa pagi.\n` +
            `* */uername* → Melihat username untuk login web based application *WL Singer*.\n` +
            `* */web* atau */app* → Shortcut untuk membuka web based application *WL Singer*.\n` +
            `* untuk mengirim *rangkuman doa pagi*, langsung kirimkan rangkuman tanpa command apapun didepannya ya. Text yang dikirim lebih dari 20 char akan dianggap rangkuman doa pagi dihari tersebut\n\n` +
            `📞 Jika butuh bantuan lebih lanjut, silakan menghubungi *Andrie* di 📲 *08119320402*`
        );
        return;
    }

    if (text === '/absensi') {
        try {
            const response = await axios.post(
                `${API_BASE_URL}/check_doapagi.php`,
                { wl_singer_id: userPhoneNumber },
                { httpsAgent: agent }
            );

            if (response.data.status === "success") {
                const jumlahKehadiran = response.data.jumlah_kehadiran;
                const today = new Date();
                const hariDalamBulan = today.getDate(); // Jumlah hari berjalan dalam bulan ini

                // 🔹 Hitung persentase kehadiran
                const persentase = ((jumlahKehadiran / hariDalamBulan) * 100).toFixed(2);

                await client.sendMessage(from, 
                    `📊 *Absensi Doa Pagi*\n\n` +
                    `📅 *Bulan ini:* ${today.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}\n` +
                    `✅ *Jumlah Hadir:* ${jumlahKehadiran} hari\n` +
                    `📆 *Total Hari Berjalan:* ${hariDalamBulan} hari\n` +
                    `📈 *Persentase Kehadiran:* ${persentase}%\n\n` +
                    `_Jangan jemu-jemu untuk terus membangun kebiasaan doa pagi ya!_ 🙏`
                );
            } else {
                await client.sendMessage(from, `⚠️ *Error:* ${response.data.message}`);
            }
        } catch (error) {
            console.error("Error fetching attendance:", error);
            await client.sendMessage(from, '⚠️ Terjadi kesalahan saat mengambil data absensi.');
        }
        return;
    }
    
    if (text === '/username') {
        try {
            const response = await axios.post(
                `${API_BASE_URL}/get_username.php`,
                { wl_singer_id: userPhoneNumber },
                { httpsAgent: agent }
            );

            if (response.data.status === "success") {
                const username = response.data.username;
                await client.sendMessage(from, `👤 Username kamu adalah *${username}*. Silahkan login dan menggunakan aplikasi kita.`);
            } else {
                await client.sendMessage(from, `⚠️ *Error:* ${response.data.message}`);
            }
        } catch (error) {
            console.error("Error fetching username:", error);
            await client.sendMessage(from, '⚠️ Terjadi kesalahan saat mengambil username.');
        }
        return;
    }

    if (text === '/web' || text === '/app') {
        await client.sendMessage(from, 
            `🌐 *Our Website* 🌐\n\n` +
            `Silahkan click link dibawah ini.\n` +
            `https://mrpribadi.com/home/\n\n` +
            `Semoga informasi ini membantu. 😊`
        );
        return;
    }

    if (text === '/event') {
        await client.sendMessage(from, 
            `📅 *Informasi Kegiatan* 📅\n\n` +
            `Event terdekat kita adalah *HOME Meet Up with ko Ephen*.\n` +
            `Yang akan dilaksanakan hari *Sabtu*, tanggal *22 Februari 2025*.\n\n` +
            `Info selanjutnya menyusul ya, stay tuned. 😊`
        );
        return;
    }

    if (text.length > 20 && !text.startsWith('/')) {
        try {
            const response = await axios.post(
                `${API_BASE_URL}/insert_doapagi.php`,
                { wl_singer_id: userPhoneNumber, content: body.trim() },
                { httpsAgent: agent }
            );

            if (response.data.status === "success") {
                const namaLengkap = response.data.nama_lengkap;
                const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

                await client.sendMessage(from, 
                    `✅ *Terima kasih, ${namaLengkap}!* Doa pagi kamu sudah diterima. \n\n` +
                    `_Selamat beraktivitas dan jangan lupa untuk selalu jadi berkat dimanapun kamu berada._ \n` +
                    `✨ *Tuhan Yesus memberkati!* 🥳`
                );

                await client.sendMessage(adminNumber, `📢 *${namaLengkap}* (${userPhoneNumber}) baru saja submit doa pagi pada *${now}*.`);
            } else {
                await client.sendMessage(from, `⚠️ *Gagal menyimpan doa pagi:* ${response.data.message}`);
            }
        } catch (error) {
            console.error("Error submitting doa pagi:", error);
            await client.sendMessage(from, '⚠️ Terjadi kesalahan saat menyimpan data.');
        }
        return;
    }
});

client.initialize();
