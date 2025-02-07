const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const https = require('https');
const express = require('express');

const app = express();
app.get('/health', (req, res) => res.status(200).send('Bot is running'));
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));

const agent = new https.Agent({ rejectUnauthorized: false });
const userStates = {};
const client = new Client({ authStrategy: new LocalAuth() });

client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('✅ Bot WhatsApp siap digunakan!'));

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
    const text = body.toLowerCase();
    const adminNumber = '628119320402@c.us';

    if (text === 'cancel' && userStates[from]) {
        delete userStates[from];
        await client.sendMessage(from, '🚫 *Oke, proses sudah kami batalkan.* \n🙋🏻‍♂️ Terima kasih dan sampai ketemu lagi.');
        return;
    }

    if (text === 'info') {
        await client.sendMessage(from, 
            `ℹ️ *Informasi DOA PAGI - WL SINGER* ℹ️\n\n` +
            `📌 *Perintah yang tersedia:*\n` +
            `* *hi* → Memulai percakapan.\n` +
            `* *doa pagi* atau *doa* → Memulai pengisian doa pagi.\n` +
            `* *daftar kegiatan* atau *daftar* → Cek daftar kegiatan.\n` +
            `* *cancel* → Membatalkan proses pengisian.\n\n` +
            `📞 Jika butuh bantuan lebih lanjut, silakan hubungi *Andrie* di 📲 *08119320402*\n`+
            `🙏🏻 Terima kasih`
        );
        return;
    }

    if (text === 'hi') {
        userStates[from] = { stage: 'waiting_for_selection' };
        const greeting = getGreeting();
        await client.sendMessage(from, `🙋🏻‍♂️ Hi .. *${greeting}* \n📌 Silakan pilih salah satu:\n✅ *doa pagi* / *doa* → Untuk mengisi doa pagi.\n✅ *daftar kegiatan* / *daftar* → Untuk melihat daftar kegiatan.`);
        return;
    }

    if (text === 'daftar kegiatan' || text === 'daftar') {
        await client.sendMessage(from, 
            `📅 *Informasi Daftar Kegiatan* 📅\n\n` +
            `⚠️ Saat ini belum ada kegiatan tersedia.\n` +
            `✨ Silakan coba lagi di lain waktu ya! Terima kasih sudah menghubungi kami. 😊`
        );
        return;
    }

    if ((text === 'doa pagi' || text === 'doa') && !userStates[from]) {
        userStates[from] = { stage: 'waiting_for_id' };
        const greeting = getGreeting();
        await client.sendMessage(from, `📝 Silakan reply dengan masukkan *ID WL / Singer* kamu ya.`);
        return;
    }

    if (userStates[from]?.stage === 'waiting_for_id') {
        const wl_singer_id = body.trim();
        if (!wl_singer_id) {
            await client.sendMessage(from, '⚠️ Maaf *ID WL / Singer* tidak boleh kosong, coba lagi ya.');
            return;
        }
        try {
            const response = await axios.post(
                "https://mrpribadi.com/home/Include/API/check_id.php",
                { wl_singer_id },
                { httpsAgent: agent }
            );
            const { responseCode, responseMessage1, responseMessage2 } = response.data;
            if (responseCode === "OK") {
                userStates[from] = { stage: 'waiting_for_content', wl_singer_id: responseMessage2, userName: responseMessage1 };
                await client.sendMessage(from, `🎉 Selamat datang *${responseMessage1}*! \nSilakan kirimkan rangkuman doa pagi hari ini.`);
            } else {
                await client.sendMessage(from, '❌ Maaf *ID WL / Singer* tidak ditemukan, coba cek lagi atau hubungi *Andrie*.');
            }
        } catch (error) {
            await client.sendMessage(from, '⚠️ Terjadi kesalahan saat memeriksa ID.');
        }
        return;
    }

    if (userStates[from]?.stage === 'waiting_for_content') {
        const userWlSingerId = userStates[from].wl_singer_id;
        const userName = userStates[from].userName;
        const userContent = body.trim();
        if (!userContent) {
            await client.sendMessage(from, '⚠️ Rangkuman doa pagi tidak boleh kosong. Silakan kirim ulang.');
            return;
        }
        try {
            await axios.post(
                "https://mrpribadi.com/home/Include/API/insert_doapagi.php",
                { wl_singer_id: userWlSingerId, content: userContent },
                { httpsAgent: agent }
            );
             
            const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
            await client.sendMessage(from, 
                `✅ *Terima kasih!* Rangkuman doa pagi kamu sudah kami terima. \n +
                _Selamat beraktivitas dan jangan lupa untuk selalu jadi berkat dimanapun kamu berada._ \n +
                *Tuhan Yesus memberkati* 🥳✨`
            );
            await client.sendMessage(adminNumber, `📢 *${userName}* baru saja submit doa pagi pada *${now}*.`);
            delete userStates[from];
        } catch (error) {
            await client.sendMessage(from, '⚠️ Terjadi kesalahan saat menyimpan data.');
        }
        return;
    }
});

client.initialize();
