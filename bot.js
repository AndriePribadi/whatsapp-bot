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

const API_BASE_URL = "https://mrpribadi.com/home/api";

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

    console.log(`Received message from: ${userPhoneNumber}`); // Log the phone number

    if (text === '/cancel' && userStates[from]) {
        delete userStates[from];
        await client.sendMessage(from, '🚫 *Oke, proses sudah kami batalkan.* \n🙋🏻‍♂️ Terima kasih dan sampai ketemu lagi.');
        return;
    }

    if (text === '/web' || text === '/app') {
        await client.sendMessage(from, 
            `🌐 *PORTAL HOME* 🌐\n\n` +
            `Silahkan click link dibawah ini ya\n` +
            `https://mrpribadi.com/home/\n\n` +
            `Semoga informasi ini membantu. 😊`
        );
        return;
    }

    // Identity check for other commands
    const identityCheck = async (attempt = 1) => {
        try {
            console.log(`🔍 [Percobaan ${attempt}] Mengecek identitas untuk nomor: ${userPhoneNumber}`);
    
            const response = await axios.post(
                `${API_BASE_URL}/get_user_by_phonenumber.php`,
                { userPhoneNumber: userPhoneNumber },
                { headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Content-Type': 'application/json'
                },
                httpsAgent: agent }
            );
    
            console.log(`✅ Identity check response: ${JSON.stringify(response.data)}`);
    
            if (response.data.responseCode === "OK") {
                userStates[from] = {
                    ...userStates[from],
                    userId: response.data.id_user,
                    userName: response.data.nama_lengkap,
                    userHomeCode: response.data.kode_home,
                    userHomeName: response.data.nama_home,
                    userUsername: response.data.username
                };
            }
            
            return response.data;
    
        } catch (error) {
            console.error(`⚠️ [Percobaan ${attempt}] Error saat cek identitas:`, error.message);
    
            if (attempt < 5) {
                // Coba lagi setelah 2 detik
                await new Promise(resolve => setTimeout(resolve, 2000));
                return identityCheck(attempt + 1);
            } else {
                // Jika gagal 5 kali, kirim pesan error ke user
                await client.sendMessage(from, '⚠️ Terjadi kesalahan saat memeriksa identitas. Silakan coba lagi nanti.');
                return null;
            }
        }
    };
    
    if (text === '/username') {
        const identity = await identityCheck();
        if (!identity || identity.responseCode !== "OK") {
            await client.sendMessage(from, `❌ Maaf nomor kamu tidak terdaftar dalam sistem, mohon menghubungi home leader masing masing, terima kasih`);
            return;
        }
        await client.sendMessage(from, `👤 Username kamu adalah *${userStates[from].userUsername}*.`);
        return;
    }

    if (text === '/hi' || text === '/info') {
        const identity = await identityCheck();
        const greeting = getGreeting();
        
        let message = '';
        if (identity && identity.responseCode === "OK" && userStates[from].userName) {
            message += `🙋🏻‍♂️ Hi ${userStates[from].userName}.. ${greeting} \n\n`;
        } else {
            message += `🙋🏻‍♂️ Hi .. ${greeting}, kamu belum terdaftar dalam sistem kami, untuk mengakses fitur lengkap pastikan kamu terdaftar sebagai home member kami ya. 😉 \n\n`;
        }
        
        message += `📌 silahkan masukan kata kunci dibawah ini ya :\n` +
            `* */hi* → Memulai percakapan dan melihat kata kunci apa saja yang tersedia.\n` +
            `* */event* → Melihat informasi kegiatan HOME yang terdekat.\n` +
            `* */birthday* → Melihat teman HOME mu yang akan berulangtahun dalam waktu dekat.\n` +
            `* */web* → Shortcut untuk membuka Portal Home.\n` +
            `* */username* → Melihat username untuk login ke Portal Home.\n`;
        
        message += `📌 Kami juga menyediakan fitur yang terhubung ke Portal Home :\n` +
            `* */sermonnote* → Membuat *catatan kotbah*.\n` +
            `* */quiettime* → Membuat *quiet time journal*.\n` +
            `* */note* → Membuat note baru.\n\n`;
        
        if (userStates[from]?.userHomeCode === 'WLS') {
            message += `🎤 Khusus untuk Home WL Singer, coba fitur ini ya :\n` +
            message += `* */absensi* → Melihat persentase kehadiran doa pagi.\n\n`;
            message += `* Dan untuk mengirim *rangkuman doa pagi*, langsung kirimkan rangkuman tanpa command apapun didepannya ya. Text yang dikirim lebih dari 20 char akan dianggap rangkuman doa pagi (khusus wl singer).\n\n`;
        }
        
        message += `Jika butuh bantuan lebih lanjut, \nJangan ragu untuk menghubungi home leader masing masing ya\n Selamat berjuang! God Bless ✨`;
        
        await client.sendMessage(from, message);
        return;
    }

    if (text === '/absensi') {
        const identity = await identityCheck();
        if (!identity || identity.responseCode !== "OK") {
            await client.sendMessage(from, `❌ Maaf nomor kamu tidak terdaftar dalam sistem, mohon menghubungi home leader masing masing, terima kasih`);
            return;
        }
        if (userStates[from].userHomeCode !== "WLS") {
            await client.sendMessage(from, `❌ Maaf, fitur ini hanya tersedia untuk home WL Singer.`);
            return;
        }
    
        const fetchAbsensi = async (attempt = 1) => {
            try {
                console.log(`🔄 Percobaan ke-${attempt} untuk mengambil data absensi...`);
    
                const response = await axios.post(
                    `${API_BASE_URL}/check_doapagi.php`,
                    { id_user: userStates[from].userId },
                    { headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Content-Type': 'application/json'
                    },
                    httpsAgent: agent }
                );
    
                if (response.data.status === "success") {
                    const jumlahKehadiran = response.data.jumlah_kehadiran;
                    const today = new Date();
                    const hariDalamBulan = today.getDate(); // Jumlah hari berjalan dalam bulan ini
    
                    // 🔹 Hitung persentase kehadiran
                    const persentase = ((jumlahKehadiran / hariDalamBulan) * 100).toFixed(2);
    
                    let pesan = "";
                    if (persentase < 60) {
                        pesan = "Yuk, kamu pasti lebih rajin lagi dalam mengikuti doa pagi ini 🤗";
                    } else if (persentase >= 60 && persentase < 80) {
                        pesan = "Wah sudah cukup baik nih, terus tingkatkan ya kerajinanmu 🤗";
                    } else {
                        pesan = "Kamu luar biasa! Yuk terus pertahankan kerajinanmu ini ya 🤗";
                    }
    
                    await client.sendMessage(from, 
                        `📊 *Absensi Doa Pagi*\n\n` +
                        `📅 Bulan *${today.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}*\n` +
                        `✅ Jumlah kehadiranmu: *${jumlahKehadiran} hari*\n` +
                        `📆 Total hari berjalan: *${hariDalamBulan} hari*\n` +
                        `📈 Persentase kehadiranmu: *${persentase}%*\n\n` +
                        `_${pesan}_`
                    );
    
                } else {
                    await client.sendMessage(from, `⚠️ *Error:* ${response.data.message}`);
                }
    
            } catch (error) {
                console.error(`⚠️ Error pada percobaan ke-${attempt}:`, error.message);
    
                if (attempt < 5) {
                    // Coba lagi setelah 2 detik
                    setTimeout(() => fetchAbsensi(attempt + 1), 2000);
                } else {
                    // Jika sudah gagal 5 kali, kirim pesan error
                    await client.sendMessage(from, "⚠️ Terjadi kesalahan saat mengambil data absensi. Silakan coba lagi nanti.");
                }
            }
        };
    
        // Jalankan percobaan pertama
        fetchAbsensi();
        return;
    }    
    
    if (text === '/event') {
        const identity = await identityCheck();
        if (!identity || identity.responseCode !== "OK") {
            await client.sendMessage(from, `❌ Maaf nomor kamu tidak terdaftar dalam sistem, mohon menghubungi home leader masing masing, terima kasih`);
            return;
        }
    
        const fetchEvent = async (attempt = 1) => {
            try {
                console.log(`🔄 Percobaan ke-${attempt} untuk mengambil data event...`);
    
                const response = await axios.get(`${API_BASE_URL}/event.php`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Content-Type': 'application/json'
                    },
                    httpsAgent: agent
                });
    
                if (response.data.status === "success") {
                    const eventDescription = response.data.deskripsi;
                    const messageText = `📅 *UPCOMING EVENT!* 📅\n\n${eventDescription}\n` +
                                        `Jangan sampai kelewatan yaaa, see you and Godbless!! 😊`;
    
                    await client.sendMessage(from, messageText);
                } else {
                    await client.sendMessage(from, "⚠️ Belum ada event yang akan datang.");
                }
    
            } catch (error) {
                console.error(`⚠️ Error pada percobaan ke-${attempt}:`, error.message);
    
                if (attempt < 5) {
                    // Coba lagi setelah 2 detik
                    setTimeout(() => fetchEvent(attempt + 1), 2000);
                } else {
                    // Jika sudah gagal 5 kali, kirim pesan error
                    await client.sendMessage(from, "⚠️ Terjadi kesalahan saat mengambil data event. Silakan coba lagi nanti.");
                }
            }
        };
    
        // Jalankan percobaan pertama
        fetchEvent();
        return;
    }
    
    // scope untuk sermon note 
    // sermon note - start 
    if (text === '/sermonnote' && (!userStates[from] || userStates[from].stage === 'waiting_for_selection')) {
        const identity = await identityCheck();
        if (!identity || identity.responseCode !== "OK") {
            await client.sendMessage(from, `❌ Maaf nomor kamu tidak terdaftar dalam sistem, mohon menghubungi home leader masing masing, terima kasih`);
            return;
        }
        userStates[from] = { stage: 'waiting_for_church' };
        await client.sendMessage(from, "🏛️ Ibadah apa yang sedang kamu ikuti saat ini?\n_untuk membatalkan proses pengisian, silahkan masukan perintah */cancel*_");
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
        await client.sendMessage(from, "📖 Apakah ada judul atau tema atau topik dari sharing yang kamu dengar saat ini?\n_(Jika tidak ada, silakan reply dengan '-')_");
        return;
    }

    if (userStates[from]?.stage === 'waiting_for_title') {
        userStates[from].title = body;
        userStates[from].stage = 'waiting_for_sermon';
        await client.sendMessage(from, "📝 Silahkan isi sermon notenya di bawah ini ya.");
        return;
    }

    if (userStates[from]?.stage === 'waiting_for_sermon') {
        userStates[from].content = body;
        userStates[from].stage = 'waiting_for_summary';
        await client.sendMessage(from, "🔍 Apakah kesimpulan yang bisa kamu ambil dari kotbah ini?\n_(Jika belum ada, silakan reply dengan '-')_");
        return;
    }

    if (userStates[from]?.stage === 'waiting_for_summary') {
        userStates[from].summary = body;
        
        // Function untuk mencoba insert sermon note dengan retry
        const insertSermonNote = async (attempt = 1) => {
            try {
                console.log(`🔄 [Percobaan ${attempt}] Menyimpan sermon note...`);
                
                const response = await axios.post(
                    `${API_BASE_URL}/insert_sermonnote.php`,
                    {
                        id_user: userStates[from].userId,
                        church_sermonnote: userStates[from].church,
                        speaker_sermonnote: userStates[from].speaker,
                        titlesermon_sermonnote: userStates[from].title,
                        content_sermonnote: userStates[from].content,
                        summary_sermonnote: userStates[from].summary,
                    },
                    { headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Content-Type': 'application/json'
                    },
                    httpsAgent: agent }
                );

                if (response.data.status === "success") {
                    await client.sendMessage(from, "✅ Catatan kotbah berhasil disimpan! \nTerus bangun kebiasaan baik ini ya 💞.");
                } else {
                    throw new Error(response.data.message || "Gagal menyimpan sermon note.");
                }

            } catch (error) {
                console.error(`⚠️ [Percobaan ${attempt}] Error saat menyimpan sermon note:`, error.message);

                if (attempt < 5) {
                    // Coba lagi setelah 2 detik
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return insertSermonNote(attempt + 1);
                } else {
                    // Jika gagal 5 kali, kirim pesan error ke user
                    await client.sendMessage(from, "❌ Maaf, terjadi kesalahan saat menyimpan catatan kotbahmu. Silakan coba lagi nanti.");
                }
            }
        };

        // Jalankan function dengan retry
        await insertSermonNote();

        // Reset state setelah selesai
        delete userStates[from];
        return;
    }
    // end - sermon note

    // Quiet Time
    if (text === '/quiettime' && (!userStates[from] || userStates[from].stage === 'qt_waiting_for_selection')) {
        userStates[from] = { stage: 'qt_waiting_for_source' };
        await client.sendMessage(from, "📖 Hai, wah aku senang sekali kamu mau membuat journal saat teduh kamu,\nKalau aku boleh tau, apa yang sekarang kamu baca atau renungkan?\n1. Bible\n2. Daily Devotion\n3. Book\n4. Other\nSilahkan jawab dengan memasukkan angkanya saja ya...");
        return;
    }

    if (userStates[from]?.stage === 'qt_waiting_for_source') {
        const validOptions = ['1', '2', '3', '4'];

        if (!validOptions.includes(body.trim())) {
            await client.sendMessage(from, "⚠️ Maaf, format yang kamu masukkan tidak sesuai. Silakan pilih dengan angka 1, 2, 3, atau 4.");
            return;
        }

        userStates[from].source = body;
        userStates[from].stage = 'qt_waiting_for_verse';
        await client.sendMessage(from, "📜 Apa buku yang kamu baca atau renungkan?");
        return;
    }

    if (userStates[from]?.stage === 'qt_waiting_for_verse') {
        userStates[from].verse = body;
        userStates[from].stage = 'qt_waiting_for_reflection';
        await client.sendMessage(from, "💭 Apa yang kamu dapat dari pembacaan ini?");
        return;
    }

    if (userStates[from]?.stage === 'qt_waiting_for_reflection') {
        userStates[from].reflection = body;
        userStates[from].stage = 'qt_waiting_for_actionplan';
        await client.sendMessage(from, "🎯 Apa yang harus kamu terapkan dalam hidup ini setelah membacanya?");
        return;
    }

    if (userStates[from]?.stage === 'qt_waiting_for_actionplan') {
        userStates[from].actionplan = body;

        const saveQuietTime = async (attempt = 1) => {
            try {
                console.log(`🔄 Percobaan ke-${attempt} untuk menyimpan Quiet Time...`);
                await axios.post(`${API_BASE_URL}/insert_quiettime.php`, {
                    id_user: userStates[from].userId,
                    source_quiettime: userStates[from].source,
                    verse_quiettime: userStates[from].verse,
                    reflection_quiettime: userStates[from].reflection,
                    actionplan_quiettime: userStates[from].actionplan,
                }, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Content-Type': 'application/json'
                    },
                    httpsAgent: agent
                });
                await client.sendMessage(from, "✅ Renungan kamu berhasil disimpan! Teruslah bertumbuh dalam firman Tuhan 💞.");
            } catch (error) {
                console.error(`⚠️ Error pada percobaan ke-${attempt}:`, error.message);
                if (attempt < 5) {
                    setTimeout(() => saveQuietTime(attempt + 1), 2000);
                } else {
                    await client.sendMessage(from, "❌ Maaf, terjadi kesalahan saat menyimpan renungan kamu.");
                }
            }
        };

        saveQuietTime();
        delete userStates[from];
        return;
    }

    // Notes
    if (text === '/note' && (!userStates[from] || userStates[from].stage === 'n_waiting_for_selection')) {
        userStates[from] = { stage: 'n_waiting_for_content' };
        await client.sendMessage(from, "📝 Silakan isi catatan kamu di bawah ini.");
        return;
    }

    if (userStates[from]?.stage === 'n_waiting_for_content') {
        userStates[from].content = body;
        
        const saveNote = async (attempt = 1) => {
            try {
                console.log(`🔄 Percobaan ke-${attempt} untuk menyimpan Catatan...`);
                await axios.post(`${API_BASE_URL}/insert_note.php`, {
                    id_user: userStates[from].userId,
                    content_note: userStates[from].content,
                }, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Content-Type': 'application/json'
                    },
                    httpsAgent: agent
                });
                await client.sendMessage(from, "✅ Catatan kamu berhasil disimpan! 😊");
            } catch (error) {
                console.error(`⚠️ Error pada percobaan ke-${attempt}:`, error.message);
                if (attempt < 5) {
                    setTimeout(() => saveNote(attempt + 1), 2000);
                } else {
                    await client.sendMessage(from, "❌ Maaf, terjadi kesalahan saat menyimpan catatan kamu.");
                }
            }
        };

        saveNote();
        delete userStates[from];
        return;
    }

    
   // Doa pagi direct input oleh setiap pengguna (jika tidak sedang dalam sesi /doa atau /sermonnote)
    if (text.length > 20 && !text.startsWith('/') && (!userStates[from] || !userStates[from].stage)) {
        const insertDoaPagi = async (attempt = 1) => {
            try {
                console.log(`🔄 Percobaan ke-${attempt} untuk menyimpan doa pagi...`);

                const response = await axios.post(
                    `${API_BASE_URL}/insert_doapagi.php`,
                    { id_user: userStates[from].userId, content: body.trim() },
                    {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                            'Content-Type': 'application/json'
                        },
                        httpsAgent: agent
                    }
                );

                if (response.data.status === "success") {
                    const namaLengkap = userStates[from].userName;
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
                console.error(`⚠️ Error pada percobaan ke-${attempt}:`, error.message);

                if (attempt < 5) {
                    // Coba lagi setelah 2 detik
                    setTimeout(() => insertDoaPagi(attempt + 1), 2000);
                } else {
                    // Jika sudah gagal 5 kali, kirim pesan error
                    await client.sendMessage(from, '⚠️ Terjadi kesalahan saat menyimpan doa pagi. Silakan coba lagi nanti.');
                }
            }
        };

        // Jalankan percobaan pertama
        insertDoaPagi();
        return;
    }
    

    // 🔹 Cek apakah user mengetik "/doa <id> <isi doa>"
    // const match = text.match(/^\/doa\s+(\S+)\s+(.+)$/i);
    const match = text.match(/^\/doa\s+(\S+)\s+([\s\S]+)$/i);

    if (match) {
        const wl_singer_id = match[1].trim();
        const content = match[2].trim();

        // Fungsi untuk mencoba proses dengan retry sampai 5 kali
        const tryProcess = async (attempt = 1) => {
            try {
                console.log(`🔄 Percobaan ke-${attempt} untuk memproses doa...`);

                // Periksa apakah ID WL/Singer valid
                const response = await axios.post(
                    `${API_BASE_URL}/check_id.php`,
                    { wl_singer_id },
                    {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                            'Content-Type': 'application/json'
                        },
                        httpsAgent: agent
                    }
                );

                const { responseCode, responseMessage1, responseMessage2 } = response.data;

                if (responseCode === "OK") {
                    // Jika ID valid, lanjut insert doa
                    const insertResponse = await axios.post(
                        `${API_BASE_URL}/insert_doapagi_inject.php`,
                        { wl_singer_id: responseMessage2, content: content },
                        {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                                'Content-Type': 'application/json'
                            },
                            httpsAgent: agent
                        }
                    );

                    if (insertResponse.data.status === "success") {
                        await client.sendMessage(from,
                            `✅ *Terima kasih, ${responseMessage1}!* \n` +
                            `Doa pagi kamu telah kami terima. \n\n` +
                            `*_Selamat beraktivitas dan tetap jadi berkat!_* ✨`
                        );
                    } else {
                        await client.sendMessage(from, `⚠️ *Error:* ${insertResponse.data.message}`);
                    }
                } else {
                    await client.sendMessage(from, `❌ Maaf, ID kamu tidak terdaftar dalam sistem. Mohon hubungi home leader masing-masing, terima kasih.`);
                }

            } catch (error) {
                console.error(`⚠️ Error pada percobaan ke-${attempt}:`, error.message);

                if (attempt < 5) {
                    // Coba lagi setelah 2 detik
                    setTimeout(() => tryProcess(attempt + 1), 2000);
                } else {
                    // Jika sudah gagal 5 kali, kirim pesan error
                    await client.sendMessage(from, '⚠️ Terjadi kesalahan saat memproses permintaan. Silakan coba lagi nanti.');
                }
            }
        };

        // Jalankan percobaan pertama
        tryProcess();
        return;
    }

    
});

client.initialize();
