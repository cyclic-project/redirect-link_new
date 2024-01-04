const express = require('express');
const fs = require('fs/promises');
const ytdl = require('ytdl-core');
const cors = require('cors');
// const bodyParser = require('body-parser');

const app = express();
const port = 3000;
const host = '0.0.0.0';

app.use(express.json());
app.use(cors());
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());

app.get('/', (req, res) => {
 res.send('Path no found')
})

app.post('/saveFullJson', (req, res) => {
 saveToJsonFile(req.body, 'limits_download.json')
 res.status(202).json({ accepted: true })
})

app.post('/adddata', async (req, res) => {
  const { dataToAdd } = req.body;

  try {
    // Baca file JSON yang telah disimpan di server 2
    const data = await readData('data_server2.json');
    let jsonData = JSON.parse(data);

    // Tambahkan data yang diterima dari server 1 ke dalam array yang sudah ada
    jsonData.push(dataToAdd);

    // Simpan data yang telah ditambahkan kembali ke dalam file JSON
    await fs.writeFile('data_server2.json', JSON.stringify(jsonData, null, 2));

    console.log('Data berhasil ditambahkan di Server 2:', jsonData);
    res.send('Data berhasil ditambahkan di Server 2');
  } catch (error) {
    console.error(error);
    res.status(500).send('Terjadi kesalahan saat menambahkan data di Server 2');
  }
});

app.post('/writedata', async (req, res) => {
 const dataToSave = req.body;

 // Simpan data dalam bentuk file di server 2
 try {
  await saveToJsonFile(dataToSave, 'data_server2.json');
  // await fs.writeFile('data_server2.json', JSON.stringify(dataToSave));
  console.log('Data berhasil disimpan di Server 2');
  res.send('Data berhasil diterima dan disimpan di Server 2');
 } catch (error) {
  console.error(error);
  res.status(500).send('Terjadi kesalahan saat menyimpan data di Server 2');
 }
});

app.post('/deletedata', async (req, res) => {
  const dataToDelete = req.body;

  try {
    // Baca file JSON yang telah disimpan di server 2
    const data = await readData('data_server2.json');
    let jsonData = JSON.parse(data);

    // Filter data berdasarkan path yang akan dihapus
    jsonData = jsonData.filter(item => item.path !== dataToDelete.path);

    // Simpan data yang telah dihapus kembali ke dalam file JSON
    await saveToJsonFile(jsonData, 'data_server2.json');

    console.log(`Data dengan path ${dataToDelete.path} berhasil dihapus di Server 2`);
    res.send(`Data dengan path ${dataToDelete.path} berhasil dihapus di Server 2`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Terjadi kesalahan saat menghapus data di Server 2');
  }
});

const updateData = async (newPath, newUrl, updatePath, footerBoleaan) => {
 try {
  // Baca data dari file
  const data = await readData('data_server2.json');

  const dataArray = JSON.parse(data);

  let pathFound;

  dataArray.forEach(item => {
   if (item.path === `/${updatePath}`) {
    item.path = newPath;
    item.url = newUrl;
    item.footer = footerBoleaan;
    pathFound = true;
   }
  });

  if (!pathFound) {
   throw new Error('Path not found in the data');
  }

  // Simpan data yang diperbarui ke file
  await saveToJsonFile(dataArray, 'data_server2.json');
 } catch (error) {
  console.error(error);
  throw new Error(`Failed to update data. ${error.message}`);
 }
};

app.put('/updateData/:path', async (req, res) => {
 const { path: updatePath } = req.params;
 const { path: newPath, url, footerCheckbox } = req.body;

 // Update data menggunakan fungsi yang telah dibuat
 try {
  // Lakukan validasi di sini sebelum memanggil fungsi updateData
  const data = await readData('data_server2.json');
  const dataArray = JSON.parse(data);
  
  let blockIt;
  dataArray.forEach(item => {
   if (item.path === `/${updatePath}`) {
    if (item.footer === footerCheckbox) {
      return res.status(409).json({ error: 'No Data Changes, reback', codeError: 101 });
    }
   }
  });
   
  if (blockIt === "1") {
    const newPathExists = dataArray.some(item => item.path === newPath);
    if (newPathExists) {
     return res.status(409).json({ error: 'New path already exists', codeError: 101 });
    }
  }

  // Panggil fungsi updateData jika validasi berhasil
  await updateData(newPath, url, updatePath, footerCheckbox);

  res.status(200).json({ message: 'Data updated successfully' });
 } catch (error) {
  console.error(error);
  res.status(500).json({ error: 'Internal Server Error' });
 }
});

// Endpoint untuk menghapus bagian dari data
// app.post('/deletedata', async (req, res) => {
//  const pathToDelete = req.body.path;

//  try {
//   // Baca file JSON yang telah disimpan di server 2
//   const data = await fs.readFile('data_server2.json', 'utf-8');
//   let jsonData = JSON.parse(data);

//   // Temukan indeks elemen yang akan dihapus berdasarkan path
//   const indexToDelete = jsonData.findIndex(item => item.path === pathToDelete);

//   if (indexToDelete !== -1) {
//    // Hapus elemen dari array berdasarkan indeks
//    jsonData.splice(indexToDelete, 1);

//    // Simpan data yang telah dihapus kembali ke dalam file JSON
//    await fs.writeFile('data_server2.json', JSON.stringify(jsonData));

//    console.log(`Data dengan path ${pathToDelete} berhasil dihapus di Server 2`);
//    res.send(`Data dengan path ${pathToDelete} berhasil dihapus di Server 2`);
//   } else {
//    console.log(`Data dengan path ${pathToDelete} tidak ditemukan di Server 2`);
//    res.status(404).send(`Data dengan path ${pathToDelete} tidak ditemukan di Server 2`);
//   }
//  } catch (error) {
//   console.error(error);
//   res.status(500).send('Terjadi kesalahan saat menghapus data di Server 2');
//  }
// });

app.get('/getdata', async (req, res) => {
 // Baca file JSON yang telah disimpan di server 2
 try {
  const data = await readData('data_server2.json');
  const jsonData = JSON.parse(data);
  console.log('Data berhasil dibaca di Server 2:', jsonData);
  res.json(jsonData);
 } catch (error) {
  console.error(error);
  res.status(500).send('Terjadi kesalahan saat membaca data di Server 2');
 }
});

// DOWNLOADER SOCIAL MEDIA VIDEO
app.get('/download/:platform/:formatConvert/:formatOriginal/:indexData', async (req, res) => {
 const { formatConvert, formatOriginal, indexData } = req.params
 const { urlVideo } = req.query
 if (req.params.platform == "yt") {
  try {
   const containerData = {
    mp4: [],
    mp3: [],
    webm: []
   };
   const info = await ytdl.getInfo(urlVideo)
   var infoFormat = info.formats

   function getDataByValue(value) {
    const [type, indexStr] = value.split(';');
    const index = parseInt(indexStr, 10);

    if (containerData[type] && containerData[type][index]) {
     return containerData[type][index];
    } else {
     return null; // Handle invalid type or index
    }
   }

   var infoFormat1 = infoFormat.filter(video => {
    const isSupportedType = ['mp4', 'mp3', 'webm'].includes(video.container)
    const isAvc1Codec = video.codecs.startsWith('avc1');
    return isSupportedType && isAvc1Codec && video.audioQuality !== 'AUDIO_QUALITY_LOW';
   })
   const hasAudio = infoFormat1.some(video => ['mp4', 'webm'].includes(video.container) && video.hasAudio);
   const hasMp4AudioOnly = infoFormat1.some(video => video.container === 'mp4' && !video.hasVideo);
   if (!hasAudio) {
    const mediumAudioFiles = infoFormat.filter(video => video.container === 'mp3' || (video.container === 'webm' && video.audioQuality === 'AUDIO_QUALITY_MEDIUM'));
    infoFormat1.push(...mediumAudioFiles);
   }
   if (!hasMp4AudioOnly) {
    const audioOnlyFiles = infoFormat.filter(video => video.container === 'mp3' || (video.container === 'webm' && !video.hasVideo));
    infoFormat1.push(...audioOnlyFiles);
   }

   infoFormat1.forEach(item => {
    if (item.container == "mp4") {
     if (item.audioQuality == "AUDIO_QUALITY_MEDIUM" && !item.qualityLabel) {
      containerData.mp3.push(item)
     } else {
      containerData.mp4.push(item)
     }
    }
    if (item.container == "webm") {
     containerData.webm.push(item)
    }
   });

   if (infoFormat && getDataByValue(`${formatOriginal};${indexData}`)) {
    const videoFormat = getDataByValue(`${formatOriginal};${indexData}`);
    const fileName = `${info.videoDetails.title}.${formatConvert}`;

    res.header('Content-Disposition', `attachment; filename="${info.videoDetails.title}.${formatConvert}"`);
    res.setHeader('Content-Type', videoFormat.mimeType);

    // Pipe the file to the response
    ytdl(urlVideo, { format: videoFormat }).pipe(res);
   } else {
    // Send an error response if needed
    res.status(400).json({
     status: 'error',
     message: 'URL process error.'
    });
   }
  } catch (error) {
   console.error(error);
   // Send an error response if needed
   res.status(500).json({
    status: 'error',
    message: 'Internal server error.'
   });
  }
 }
})

app.post('/getFullData/', async (req, res) => {
 const jsonData = await readData("limits_download.json");
 (jsonData) ? res.status(201).json(jsonData) : res.status(202).json({ message: "Data not found" })
})

app.post('/manageLimit', async (req, res) => {
 const { platform, configData } = req.body;
 const option = configData.option;
 const code = configData.code;
 var message;

 try {
  const jsonData = await readData('limits_download.json')
  const data = JSON.parse(jsonData);

  const codeObject = data.find(item => item.platform === platform && item.code === code);

  if (codeObject) {
   if (option == "reset") {
    codeObject.limit = 0;
    message = "Reset to 0 (Limit) Successfully"
   }
   if (option == "unlimited") {
    codeObject.unlimited = (codeObject.unlimited == 1) ? 0 : 1;
    message = `Set to ${codeObject.unlimited} Unlimited Successfully`
   }
   if (option == "nama") {
    codeObject.name = configData.nama
    message = `Set nama Successfully`
   }
   if (option == "set") {
    codeObject.maxLimit = (configData.maxLimit) ? parseInt(configData.maxLimit) : codeObject.maxLimit;
    message = `Set MaxLimit to ${codeObject.maxLimit} Successfully`
   }
   await saveToJsonFile(data, 'limits_download.json')

   res.status(200).json({ message });
  } else {
   res.status(404).send('Code not found.');
  }
 } catch (error) {
  console.error('Error:', error.message);
  res.status(500).send('Internal Server Error');
 }
});

function isSameDate(dateString1, dateString2) {
 const date1 = new Date(dateString1);
 const date2 = new Date(dateString2);

 return (
  date1.getFullYear() === date2.getFullYear() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getDate() === date2.getDate()
 );
}

app.post('/getLimit/:platform', async (req, res) => {
 const { code, currentDate } = req.body;
 const { platform } = req.params;

 try {
  // Baca isi file JSON
  const jsonContent = await readData('limits_download.json')
  const data = JSON.parse(jsonContent);

  const foundItem = data.find(item => item.platform === platform && item.code === code);

  if (foundItem) {
   if (isSameDate(currentDate, foundItem.date)) {
    foundItem.remainLimits = foundItem.maxLimit - foundItem.limit
    res.json({ limit: foundItem.limit, remainLimits: foundItem.remainLimits, unlimitedd: foundItem.unlimited });
   } else {
    foundItem.limit = 0;
    foundItem.date = currentDate;

    res.json({ limit: foundItem.limit });
   }
   saveToJsonFile(data, 'limits_download.json');
  } else {
   res.status(404).json({ error: 'Code not found' });
  }
 } catch (error) {
  console.error('Error reading JSON file:', error.message);
  res.status(500).json({ error: 'Internal Server Error' });
 }
});

app.post('/updateCodeLimit/:platform', async (req, res) => {
 try {
  const requestData = req.body;

  const jsonData = await readData("limits_download.json")
  const data = JSON.parse(jsonData);

  const codeObject = data.find(item => item.platform === req.params.platform && item.code === requestData.code);
  const currentLimit = parseInt(codeObject.limit) || 0;

  if (codeObject) {
   const newLimit = currentLimit + 1;

   if (codeObject.unlimited == "1") {
    codeObject.limit = 0;
    saveToJsonFile(data, 'limits_download.json')
    res.status(200).json({ success: true, unlimited: 1 })
   } else {
    if (newLimit <= 10) {
     codeObject.limit = newLimit;
     codeObject.remainLimits = codeObject.maxLimit - newLimit

     saveToJsonFile(data, 'limits_download.json');

     res.status(200).json({ success: true, limit: newLimit, maxLimit: codeObject.maxLimit });
    } else {
     // res.status(304).json({ error: 'Limit sudah mencapai batas maksimum' });
     res.status(203).json({ message: 'limit sudah tercapai!', limit: currentLimit })
    }
   }
  } else {
   res.status(404).send('Code tidak ditemukan');
  }
 } catch (error) {
  console.error('Terjadi kesalahan:', error.message);
  res.status(500).send('Terjadi kesalahan');
 }
});

function codeExists(code, platform, jsonData) {
 return jsonData.some(item => item.code === code && item.platform === platform);
}

app.post('/generate_code/:platform', async (req, res) => {
 const limitsData = await readData('limits_download.json')
 const dataLimits = JSON.parse(limitsData);
 const randomCode = generateRandomCode();
 const currentDate = new Date();
 const formattedDate = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;

 while (codeExists(randomCode, req.params.platform, dataLimits)) {
  randomCode = generateRandomCode();
 }

 dataLimits.push({
  "platform": req.params.platform,
  "code": randomCode,
  "limit": 0,
  "date": formattedDate,
  "maxLimit": 10,
  "name": "",
  "unlimited": 0,
  "remainLimits": 10,
 });

 saveToJsonFile(dataLimits, 'limits_download.json');

 res.json({ code: randomCode });
});

function generateRandomCode() {
 const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
 let randomCode = '';
 for (let i = 0; i < 30; i++) {
  randomCode += characters.charAt(Math.floor(Math.random() * characters.length));
 }
 return randomCode;
}

// SAVE CODE UNIVERSAL
function saveToJsonFile(data, fileName) {
 fs.writeFile(fileName, JSON.stringify(data, null, 2), 'utf-8');
 // fs.writeFileSync('limits_download.json', JSON.stringify(data, null, 2), 'utf-8');
}

async function readData(fileName) {
 const data = await fs.readFile(fileName, 'utf-8') || "[]";
 return data;
}

app.listen(port, host, () => {
 console.log(`Server 2 berjalan di http://localhost:${port}`);
});
