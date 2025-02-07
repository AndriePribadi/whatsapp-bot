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

client.on('message', async (message) => {
    const { from, body } = message;
    const text = body.toLowerCase();
    const adminNumber = '628119320402@c.us'; // Ganti dengan nomor admin

    // Jika user mengetik "cancel"
    if (text === 'cancel' && userStates[from]) {
        delete userStates[from];
        await client.sendMessage(from, '🚫 *Oke, proses kami batalkan ya.* \nTerima kasih dan sampai ketemu lagi 🙋🏻‍♂️');
        return;
    }

    // Langkah 1: User mengetik "doa pagi" atau "hi"
    if ((text === 'doa pagi' || text === 'hi') && !userStates[from]) {
        userStates[from] = { stage: 'waiting_for_id' };
        await client.sendMessage(from, '*🙋🏻‍♂️ Hi... Shalom dan selamat pagi! 🌞* \n📝 Silakan masukkan *ID WL / Singer* kamu ya.');
        return;
    }

    // Langkah 2: User mengisi wl_singer_id
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
            console.log(`ID: ${wl_singer_id}, Response:`, response.data);

            if (responseCode === "OK") {
                userStates[from] = { stage: 'waiting_for_content', wl_singer_id: responseMessage2 };
                await client.sendMessage(from, `🎉 Selamat datang *${responseMessage1}*! \nSilakan kirimkan rangkuman doa pagi hari ini.`);
            } else {
                await client.sendMessage(from, '❌ Maaf *ID WL / Singer* tidak ditemukan, coba di cek lagi atau hubungi *Andrie* ya untuk info lebih lanjut.');
            }
        } catch (error) {
            console.error("❌ Error saat memeriksa ID:", error);
            await client.sendMessage(from, '⚠️ Terjadi kesalahan saat memeriksa ID.');
        }
        return;
    }

    // Langkah 3: User mengisi content setelah ID valid
    if (userStates[from]?.stage === 'waiting_for_content') {
        const userWlSingerId = userStates[from].wl_singer_id;
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
            await client.sendMessage(from, `✅ *Terima kasih!* \nRangkuman doa pagi kamu sudah kami terima dan kami simpan. \n🕰️ Berhasil disimpan pada : *${now}* \n*_Selamat beraktivitas dan jangan lupa untuk selalu jadi berkat dimanapun kita berada ya._* \nTuhan Yesus memberkati 🥳✨`);

            // Kirim notifikasi ke nomor admin
            await client.sendMessage(adminNumber, `📢 DOA PAGI Info! \nID: *${userWlSingerId}* baru saja submit doa pagi pada *${now}*.`);

            delete userStates[from];
        } catch (error) {
            console.error('❌ Error saat menyimpan data:', error);
            await client.sendMessage(from, '⚠️ Terjadi kesalahan saat menyimpan data.');
        }
        return;
    }
});

client.initialize();
