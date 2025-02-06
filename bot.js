const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const https = require('https');

// Bypass SSL error untuk API self-signed
const agent = new https.Agent({
    rejectUnauthorized: false,
});

// Simpan status user yang sedang berinteraksi dengan bot
const userStates = {};

// Inisialisasi WhatsApp bot
const client = new Client({
    authStrategy: new LocalAuth(), // Simpan sesi login agar tidak scan ulang
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Bot WhatsApp siap digunakan!');
});

client.on('message', async (message) => {
    const { from, body } = message;

    // Langkah 1: User mengetik "doa pagi"
    if (body.toLowerCase() === 'doa pagi' && !userStates[from]) {
        userStates[from] = { stage: 'waiting_for_id' };
        await client.sendMessage(from, '*🙋🏻‍♂️ Hi... Shalom* \n🌞 selamat pagi, \n📝silahkan masukan *ID* kamu ya.');
        return;
    }

    // Langkah 2: User mengisi wl_singer_id
    if (userStates[from]?.stage === 'waiting_for_id') {
        const wl_singer_id = body.trim(); // Hapus spasi berlebih

        // Cek apakah wl_singer_id hanya berisi angka
        if (!/^\d+$/.test(wl_singer_id)) {
            await client.sendMessage(from, '⚠️ ID hanya boleh berupa *angka*, coba lagi ya.');
            return;
        }

        if (!wl_singer_id) {
            await client.sendMessage(from, '⚠️ ID tidak boleh kosong, coba lagi ya.');
            return;
        }

        try {
            // Cek ke API apakah wl_singer_id valid
            const response = await axios.post(
                "https://mrpribadi.com/home/Include/checkid.php",
                { wl_singer_id: wl_singer_id },
                { httpsAgent: agent }
            );

            const { responseCode, responseMessage } = response.data;

            // console.log("wl_singer_id : " + wl_singer_id);
            // console.log("response.data : " + response.data);
            // console.log("responseCode : " + responseCode);
            // console.log("responseMessage : " + responseMessage);

            if (responseCode === "OK") {
                userStates[from].wl_singer_id = wl_singer_id;
                userStates[from].stage = 'waiting_for_content';
                await client.sendMessage(from, `🎉 Selamat datang *${responseMessage}*! \nSilakan kirimkan rangkuman doa pagi hari ini.`);
            } else {
                await client.sendMessage(from, '❌ ID tidak ditemukan, mohon dicoba kembali.');
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
        const userContent = body.trim(); // Ambil isi pesan

        if (!userContent) {
            await client.sendMessage(from, '⚠️ Content tidak boleh kosong. Silakan kirim ulang.');
            return;
        }

        try {
            // Kirim data ke API doapagiapi.php
            await axios.post(
                "https://mrpribadi.com/home/Include/doapagiapi.php",
                { wl_singer_id: userWlSingerId, content: userContent },
                { httpsAgent: agent }
            );

            await client.sendMessage(from, '✅ Terima kasih! \nDoa pagi kamu udah kami terima dan kami disimpan. \n*_Selamat beraktifitas dan jangan lupa jadi berkat ya_.* \nTuhan Yesus memberkati 🥳✨');
            delete userStates[from]; // Reset status user setelah sukses
        } catch (error) {
            console.error('❌ Error saat menyimpan data:', error);
            await client.sendMessage(from, '⚠️ Terjadi kesalahan saat menyimpan data.');
        }

        return;
    }
});

// Jalankan bot WhatsApp
client.initialize();
