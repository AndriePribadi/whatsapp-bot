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
            `📌 *Terima kasih sudah terhubung dengan kami, command yang tersedia saat ini :*\n` +
            `* */hi* atau */info* → Memulai percakapan dan melihat command apa yang tersedia.\n` +
            `* */event* → Melihat informasi kegiatan dan pendaftaran terdekat.\n` +
            `* */absensi* → Melihat persentase kehadiran doa pagi.\n` +
            `* */uername* → Melihat username untuk login web based application *WL Singer*.\n` +
            `* */web* atau */app* → Shortcut untuk membuka web based application *WL Singer*.\n` +
            `* untuk mengirim *rangkuman doa pagi*, langsung kirimkan rangkuman tanpa command apapun didepannya ya. Text yang dikirim lebih dari 20 char akan dianggap rangkuman doa pagi dihari tersebut\n\n` +
            `📞 Jika butuh bantuan lebih lanjut, silakan menghubungi *Andrie* di 📲 *08119320402*`
        );
        return;
    }

    if (text === '/absensi' || text === '/username') {
        await client.sendMessage(from, 
            `📅 *Function still on progress* 📅\n\n` +
            `Untuk saat ini, fitur ini masih dalam proses pengerjaan ya, kami akan secepatnya menghadirkan fitur ini.\n` +
            `Terima kasih sudah menghubungi kami dan semoga informasi yang kami sampaikan membantu. 😊`
        );
        return;
    }

    if (text === '/web' || text === '/app') {
        await client.sendMessage(from, 
            `🌐 *Our Website* 🌐\n\n` +
            `Silahkan click link dibawah ini.\n` +
            `https://mrpribadi.com/home/` +
            `Terima kasih sudah menghubungi kami dan semoga informasi yang kami sampaikan membantu. 😊`
        );
        return;
    }

    if (text === '/event') {
        await client.sendMessage(from, 
            `📅 *Informasi Kegiatan* 📅\n\n` +
            `Mohon maaf saat ini belum ada informasi kegiatan yang tersedia tersedia.\n` +
            `Terima kasih sudah menghubungi kami dan semoga informasi yang kami sampaikan membantu. 😊`
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
