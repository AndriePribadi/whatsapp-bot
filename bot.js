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
            `* */hi* atau */info* → Memulai percakapan dan melihat kata kunci apa saja yang tersedia.\n` +
            `* */event* → Melihat informasi kegiatan paling dekat.\n` +
            `* */absensi* → Melihat persentase kehadiran doa pagi.\n` +
            `* */birthday* → Melihat siapa saja yang akan berulangtahun dalam waktu dekat.\n` +
            `* */sermonnote* → Membuat *catatan kotbah* (_connected to apps_).\n` +
            `* */username* → Melihat username yang bisa kamu gunakan untuk login aplikasi *WL Singer* berbasis web.\n` +
            `* */web* atau */app* → Link untuk membuka aplikasi *WL Singer* berbasis web .\n` +
            `* untuk mengirim *rangkuman doa pagi*, langsung kirimkan rangkuman tanpa command apapun didepannya ya. Text yang dikirim lebih dari 20 char akan dianggap rangkuman doa pagi dihari tersebut.\n\n` +
            `Jika butuh bantuan lebih lanjut, \nsilakan menghubungi *Andrie* di *08119320402*...\nGod Bless ✨`
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

                let pesan = "";
                if(persentase < 50){
                    pesan = "Yuk, kamu pasti lebih rajin lagi dalam mengikuti doa pagi ini 🤗";
                }else if(persentase >= 50 && persentase < 85){
                    pesan = "Wah sudah sangat baik nih, terus tingkatkan ya kerajinanmu 🤗";
                }else{
                    pesan = "✨💯 untukmu!! Terus pertahankan kerajinanmu ini ya 🤗";
                }

                await client.sendMessage(from, 
                    `📊 *Absensi Doa Pagi*\n\n` +
                    `📅 Bulan *${today.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}*\n` +
                    `✅ Jumlah kehadiran: *${jumlahKehadiran} hari*\n` +
                    `📆 Total hari berjalan: *${hariDalamBulan} hari*\n` +
                    `📈 Persentase kehadiran: *${persentase}%*\n\n` +
                    `_${pesan}_`
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
                await client.sendMessage(from, `👤 Username kamu adalah *${username}*.`);
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
            `Silahkan click link dibawah ini ya\n` +
            `https://mrpribadi.com/home/\n\n` +
            `Semoga informasi ini membantu. 😊`
        );
        return;
    }

    // if (text === '/event') {
    //     await client.sendMessage(from, 
    //         `📅 *Informasi Kegiatan* 📅\n\n` +
    //         `Event terdekat kita adalah *HOME Meet Up with ko Ephen*.\n` +
    //         `Yang akan dilaksanakan hari *Sabtu*, tanggal *22 Februari 2025*.\n\n` +
    //         `Info selanjutnya menyusul ya, stay tuned. 😊`
    //     );
    //     return;
    // }
    // 🔹 Jika user mengetik "/event"
    if (text === "/event") {
        try {
            const response = await axios.get(`${API_BASE_URL}/event.php`, { httpsAgent: agent });
    
            if (response.data.status === "success") {
                const eventDescription = response.data.deskripsi;
                const messageText = `📅 *Event Berikutnya!* 📅\n\n${eventDescription}\n\n` +
                                    `Info selanjutnya menyusul ya, stay tuned. 😊`
    
                await client.sendMessage(from, messageText);
            } else {
                await client.sendMessage(from, "⚠️ Belum ada event yang akan datang.");
            }
        } catch (error) {
            console.error("Error fetching event:", error);
            await client.sendMessage(from, "⚠️ Terjadi kesalahan saat mengambil data event.");
        }
        return;
    }

    // doa pagi - inject oleh admin
    // doa pagi start
    if (text === '/doa' && (!userStates[from] || userStates[from].stage === 'waiting_for_selection')) {
        userStates[from] = { stage: 'waiting_for_id' };
        await client.sendMessage(from, `📝 Silakan masukkan *_ID WL / Singer_* kamu ya.`);
        return;
    }

    if (userStates[from]?.stage === 'waiting_for_id') {
        const wl_singer_id = body.trim();
        if (!wl_singer_id.startsWith('/')) { // Pastikan ID bukan command
            try {
                const response = await axios.post(
                    `${API_BASE_URL}/check_id.php`,
                    { wl_singer_id },
                    { httpsAgent: agent }
                );
                const { responseCode, responseMessage1, responseMessage2 } = response.data;
                if (responseCode === "OK") {
                    userStates[from] = { stage: 'waiting_for_content', wl_singer_id: responseMessage2, userName: responseMessage1 };
                    await client.sendMessage(from, `🎉 Selamat datang *${responseMessage1}*! \nSilakan kirimkan rangkuman doa pagi hari ini.`);
                } else {
                    await client.sendMessage(from, '❌ Maaf *ID WL / Singer* tidak ditemukan, mohon coba cek kembali atau hubungi *Andrie* ya.');
                }
            } catch (error) {
                await client.sendMessage(from, '⚠️ Terjadi kesalahan saat memeriksa ID.');
            }
        }
        return;
    }
    // doa pagi end

    // scope untuk sermon note 
    // sermon note - start 
    if (text === '/sermonnote' && (!userStates[from] || userStates[from].stage === 'waiting_for_selection')) {
        userStates[from] = { stage: 'waiting_for_church' };
        await client.sendMessage(from, "🏛️ Ibadah apa yang sedang kamu ikuti saat ini?");
        return;
    }

    if (userStates[from]?.stage === 'waiting_for_church') {
        userStates[from].church = body;
        userStates[from].stage = 'waiting_for_speaker';
        await client.sendMessage(from, "🎤 Siapa nama pembicara yang saat ini ingin kamu catat?\n_(Jika tidak ada, silakan reply dengan '-')_");
        return;
    }

    if (userStates[from]?.stage === 'waiting_for_speaker') {
        userStates[from].speaker = body;
        userStates[from].stage = 'waiting_for_title';
        await client.sendMessage(from, "📖 Apa judul atau tema kotbahnya saat ini?\n_(Jika tidak ada, silakan reply dengan '-')_");
        return;
    }

    if (userStates[from]?.stage === 'waiting_for_title') {
        userStates[from].title = body;
        userStates[from].stage = 'waiting_for_content';
        await client.sendMessage(from, "📝 Silahkan isi catatan kotbahnya di bawah ini.");
        return;
    }

    if (userStates[from]?.stage === 'waiting_for_content') {
        userStates[from].content = body;
        userStates[from].stage = 'waiting_for_summary';
        await client.sendMessage(from, "🔍 Apakah kesimpulan yang bisa kamu ambil dari kotbah ini?\n_(Jika belum ada, silakan reply dengan '-')_");
        return;
    }

    if (userStates[from]?.stage === 'waiting_for_summary') {
        userStates[from].summary = body;
        userStates[from].stage = 'waiting_for_remindme';
        await client.sendMessage(from, "⏰ Apakah ada hal penting yang perlu kamu ingat dan bisa kami ingatkan di kemudian hari?\n_(Jika belum ada, silakan reply dengan '-')_");
        return;
    }

    if (userStates[from]?.stage === 'waiting_for_remindme') {
        userStates[from].remindme = body;
        try {
            await axios.post(
                `${API_BASE_URL}/insert_sermonnote.php`,
                {
                    wl_singer_id: from,
                    church_sermonnote: userStates[from].church,
                    speaker_sermonnote: userStates[from].speaker,
                    titlesermon_sermonnote: userStates[from].title,
                    content_sermonnote: userStates[from].content,
                    summary_sermonnote: userStates[from].summary,
                    remindme_sermonnote: userStates[from].remindme,
                },
                { httpsAgent: agent }
            );
            await client.sendMessage(from, "✅ Catatan kotbah berhasil disimpan! \nTerus bangun kebiasaan baik ini ya 💞.");
        } catch (error) {
            await client.sendMessage(from, "❌ Maaf, terjadi kesalahan saat menyimpan catatan kotbahmu.");
        }
        delete userStates[from];
        return;
    }
    // end - sermon note
    
    if (userStates[from]?.stage === 'waiting_for_content') {
        const userWlSingerId = userStates[from].wl_singer_id;
        const userName = userStates[from].userName;
        const userContent = body.trim();
        if (!userContent.startsWith('/')) { // Pastikan bukan command
            try {
                await axios.post(
                    `${API_BASE_URL}/insert_doapagi.php`,
                    { wl_singer_id: userWlSingerId, content: userContent },
                    { httpsAgent: agent }
                );
                 
                const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
                await client.sendMessage(from, 
                    `*Terima kasih!* Rangkuman doa pagi kamu sudah kami terima. \n\n` +
                    `_Selamat beraktivitas dan jangan lupa untuk selalu jadi berkat dimanapun kamu berada._ \n` +
                    `*Tuhan Yesus memberkati* 🥳✨`
                );
                await client.sendMessage(adminNumber, `📢 *${userName}* baru saja submit doa pagi pada *${now}*.`);
                delete userStates[from];
            } catch (error) {
                await client.sendMessage(from, '⚠️ Terjadi kesalahan saat menyimpan data.');
            }
        }
        return;
    }

    // Doa pagi direct input oleh setiap pengguna (jika tidak sedang dalam sesi /doa atau /sermonnote)
    if (text.length > 20 && !text.startsWith('/') && (!userStates[from] || !userStates[from].stage)) {
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
    
    // 🔹 Jika user mengetik "/birthday"
    if (text === "/birthday") {
        try {
            const response = await axios.get(`${API_BASE_URL}/birthday.php`, { httpsAgent: agent } );
            
            if (response.data.status === "success") {
                const birthdayList = response.data.birthdays;

                let messageText = "🎂 *Upcoming Birthdays!* 🎂\n";
                birthdayList.forEach((b, index) => {
                    messageText += `\n${index + 1}. *${b.nama_lengkap}* - ${b.tanggal_lahir}`;
                });

                // messageText += "\n\n✨ Jangan lupa ucapkan selamat ya! 🎉";

                await client.sendMessage(from, messageText);
            } else {
                await client.sendMessage(from, "⚠️ Tidak ada ulang tahun dalam waktu dekat.");
            }
        } catch (error) {
            console.error("Error fetching birthdays:", error);
            await client.sendMessage(from, "⚠️ Terjadi kesalahan saat mengambil data ulang tahun.");
        }
        return;
    }
    
});

client.initialize();
