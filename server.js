const express = require('express');
const fs = require('fs/promises');
const ytdl = require('ytdl-core');
const cors = require('cors');
const { Client } = require('pg');
// const axios = require('axios');
// const bodyParser = require('body-parser');
var urlBackend = "https://render-backend.marsell.tech"

const app = express();
const port = 3000;
const host = '0.0.0.0';

app.use(express.json()).use(cors());
// app.use((req, res, next) => {
//     res.setHeader('Access-Control-Allow-Origin', '*'); // Replace your_frontend_port with the actual port your frontend is running on
//     res.setHeader('Access-Control-Allow-Methods', '*');
//     // res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
//     next();
// });
// app.use(cors({
//   origin: ['https://downloader.marsell.tech', 'http://localhost:3000'], 
//   methods: ['GET', 'POST'],
//   optionsSuccessStatus: 204,
// }));
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());

function wait(ms) {
 return new Promise(resolve => setTimeout(resolve, ms));
}

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// POSTGRESQL (DATABASE)
const connectionString = 'postgres://marsel:2e7cDKt49xYEkgsONFdO4Wtxul3uI04N@dpg-cmb72bta73kc73bq6g2g-a.singapore-postgres.render.com/marsel';

const client = new Client({
 connectionString: connectionString,
 ssl: {
  rejectUnauthorized: false, // Tambahkan opsi ini jika menggunakan SSL
 },
});

function checkDataType(data) {
 const result = {};
 for (const key in data) {
  if (typeof data[key] === "string") {
   result[`${key} VARCHAR(255)`] = ""
  } else if (typeof data[key] === "number") {
   result[`${key} INT`] = ""
  } else {
   result[key] = "number";
  }
 }
 return result;
}

client.connect();
async function writeDataToDatabase(jsonData, tableName) {
 try {
  var dataCheck = checkDataType(jsonData[0])
  var configNewTable;
  for (const data in dataCheck) {
   configNewTable += `${data}\n`
  }

  await getData(tableName, 'check')

  for (const data of jsonData) {
      console.log(data)
   const query = {
    text: 'INSERT INTO sessionCode(platform, code, "limit", date, maxlimit, name, unlimited, remainlimits) VALUES($1, $2, $3, $4, $5, $6, $7, $8)',
    values: [data.platform, data.code, data.limit, data.date, data.maxlimit, data.name, data.unlimited, data.remainlimits],
   };

   await client.query(query);
  }

  console.log('Data has been successfully written to postgresql.');
 } catch (error) {
  console.error('Error writing data to table:', error);
 } finally {
  // await client.end();
 }
}

async function getData(tableName, type) {
 try {
  // await client.connect();


  const checkTableQuery = await client.query(`
  SELECT to_regclass('public.sessionCode') IS NOT NULL AS table_exists;
  `)

  if (checkTableQuery.rows[0].table_exists) {
   const getDataQuery = await client.query(`SELECT * FROM ${tableName}`);

   if (type) {
    client.query(`DELETE FROM ${tableName}`)
    return client.query(`
     SELECT setval(pg_get_serial_sequence('sessionCode', 'id'), coalesce(max(id), 1), false)
     FROM ${tableName};
    `)
   }
   return getDataQuery.rows
  } else {
   const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
          id SERIAL PRIMARY KEY,
          platform VARCHAR(255),
          code VARCHAR(255),
          "limit" INT,
          date VARCHAR(255),
          maxlimit INT,
          name VARCHAR(255),
          unlimited INT,
          remainlimits INT
        );
      `;

   await client.query(createTableQuery);

   console.log('Table "sessionCode" has been created.');
  }

 } catch (error) {
  console.error('Error creating table:', error);
 } finally {
  // await client.end();
 }
}

async function syncData() {
 axios({
  method: 'post',
  url: `${urlBackend}/getFullData`,
 }).then(async function (response) {
  console.log(response.data)
  if (response.data.message) return console.log("Error")
  if (response.data.length < 6) {
   console.log("Can't get latest data, syncronizing...")
   wait(2000)
   var dataSession = await getData('sessionCode')
   await axios({
    method: 'post',
    url: `${urlBackend}/saveFullJson`,
    data: dataSession,
   }).then(async function (res) {
    if (res.status == 202) {
     console.log("Done saving full json!")
    }
   })
   fullDataSessionn = dataSession
   return console.log("Done syncronizing database to temp file!")
  }
  const data = JSON.parse(response.data)
  writeDataToDatabase(data, 'sessionCode')
  if (response.data.length > 15) {
   
  }
  fullDataSessionn = data
  return console.log('Done syncronizing with Datbaase')
 })
}

// ==========================================================

app.get('/', (req, res) => {
 res.send('Path no found')
})

app.post('/saveFullJson', (req, res) => {
 // console.log(req.body.dataSession)
 console.log(req.body)
 saveToJsonFile(req.body.dataSession, req.body.fileName)
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
  // res.send(`Data dengan path ${dataToDelete.path} berhasil dihapus di Server 2`);
  res.json({ message: `Data dengan path ${dataToDelete.path} berhasil dihapus di Server 2`, code: 200 })
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

// app.put('/updateData/:path', async (req, res) => {
//  const { path: updatePath } = req.params;
//  const { path: newPath, url, footerCheckbox } = req.body;

//  // Update data menggunakan fungsi yang telah dibuat
//  try {
//   // Lakukan validasi di sini sebelum memanggil fungsi updateData
//   const data = await readData('data_server2.json');
//   const dataArray = JSON.parse(data);
  
//   let blockIt;
//   dataArray.forEach(item => {
//    if (item.path === `/${updatePath}`) {
//     if (item.footer === footerCheckbox) {
//       return res.status(409).json({ error: 'No Data Changes, reback', codeError: 101 });
//     }
//    }
//   });
   
//   if (blockIt === "1") {
//     const newPathExists = dataArray.some(item => item.path === newPath);
//     if (newPathExists) {
//      return res.status(409).json({ error: 'New path already exists', codeError: 101 });
//     }
//   }

//   // Panggil fungsi updateData jika validasi berhasil
//   await updateData(newPath, url, updatePath, footerCheckbox);

//   res.status(200).json({ message: 'Data updated successfully' });
//  } catch (error) {
//   console.error(error);
//   res.status(500).json({ error: 'Internal Server Error' });
//  }
// });

app.put('/updateData/:path', async (req, res) => {
 const { path: updatePath } = req.params;
 const { path: newPath, url, footerCheckbox } = req.body;

 // Update data menggunakan fungsi yang telah dibuat
 try {
  // Lakukan validasi di sini sebelum memanggil fungsi updateData
  const data = await readData('data_server2.json');
  const dataArray = JSON.parse(data);

  var blockMessage;

  dataArray.forEach(item => {
   if (item.path == `/${updatePath}`) {
    if (item.path == newPath) {
     if (item.footer === footerCheckbox) {
      blockMessage = `error: 'No Data Changes, reback', codeError: 406`
     }
    }
   }
   if (item.path == newPath) {
    blockMessage = `error: 'New path already exists', codeError: 409`
    // blockMessage.push(`{ error: 'New path already exists', codeError: 409 }`)
    // return res.json({ error: 'New path already exists', codeError: 409 });
   }
  });

  if (blockMessage) {
   let [textWithoutNumbers, numbers] = blockMessage.match(/([a-zA-Z\s:']+)|(\d+)/g).reduce(([text, nums], match) => isNaN(match) ? [text + match, nums] : [text, [...nums, Number(match)]], ["", []]); 

   var error = `${textWithoutNumbers.trim()}`
   const codeError = numbers[0]
   return res.json({ error, codeError })
  }

  await updateData(newPath, url, updatePath, footerCheckbox);

  res.status(200).json({ message: 'Data updated successfully' });
 } catch (error) {
  // console.error(error);
  // res.status(500).json({ error: 'Internal Server Error' });
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
  console.log(data)
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

// app.post('/getFullData/', async (req, res) => {
//  // await syncData()
//  const jsonData = await readData("limits_download.json");
//  (jsonData) ? res.status(201).json(jsonData) : res.status(202).json({ message: "Data not found" })
// })

app.post('/deleteDataSocial', async (req, res) => {
 const { sessionCode, platform, fileName } = req.body;
 const data = await readData(fileName);
 const dataParse = JSON.parse(data)

 try {
  const updateArray = dataParse.filter(item => !(item.code === sessionCode && item.platform === platform));
 
  await saveToJsonFile(updateArray, 'limits_download.json')
 
  res.json({ message: `Data dengan sessionCode ${sessionCode} dan platform ${platform} berhasil dihapus.` });
 } catch(error) {
  res.json({ message: "Error", error: error})
 }
});

app.post('/getFullData/', async (req, res) => {
 // await syncData()
 const jsonData = await readData(req.body.fileName || req.body.data.fileName);
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
    codeObject.maxlimit = (configData.maxlimit) ? parseInt(configData.maxlimit) : codeObject.maxlimit;
    codeObject.remainlimits = codeObject.maxlimit - codeObject.limit
    message = `Set MaxLimit to ${codeObject.maxlimit} Successfully`
   }

   await writeDataToDatabase(data, 'sessionCode')
   // console.log('Done writing to database: ', await getData('sessionCode'))
   await client.query(`
UPDATE sessionCode
SET 
  id = COALESCE(id, 0),
  platform = COALESCE(platform, ''),
  code = COALESCE(code, ''),
  "limit" = COALESCE("limit", 0),
  date = COALESCE(date, ''),
  maxlimit = COALESCE(maxlimit, ''),
  remainlimits = COALESCE(remainlimits, 0),
  unlimited = COALESCE(unlimited::integer, 0),
  name = COALESCE(name, '');

   `);
   await saveToJsonFile(data, 'limits_download.json')
   // console.log('Done writing to file: ', await readData('limits_download.json'))
   // await syncData()

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
    foundItem.remainlimits = foundItem.maxlimit - foundItem.limit
    res.json({ limit: foundItem.limit, remainLimits: foundItem.remainlimits, unlimitedd: foundItem.unlimited });
   } else {
    foundItem.limit = 0;
    foundItem.date = currentDate;

    res.json({ limit: foundItem.limit });
   }
   saveToJsonFile(data, 'limits_download.json');
   // writeDataToDatabase(data, 'sessionCode')
   
   // await axios.post(`https://youtubedownloader10.azurewebsites.net/backend/syncDb`)
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
  // await syncData()
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
    // writeDataToDatabase(data, 'sessionCode')
    // await axios.post(`https://youtubedownloader10.azurewebsites.net/backend/syncDb`)
    
    res.status(200).json({ success: true, unlimited: 1 })
   } else {
    if (newLimit <= 10) {
     codeObject.limit = newLimit;
     codeObject.remainlimits = codeObject.maxlimit - newLimit

     saveToJsonFile(data, 'limits_download.json');
     // writeDataToDatabase(data, 'sessionCode')

     // await axios.post(`https://youtubedownloader10.azurewebsites.net/backend/syncDb`)

     res.status(200).json({ success: true, limit: newLimit, maxLimit: codeObject.maxlimit });
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
  "maxlimit": 10,
  "name": "",
  "unlimited": 0,
  "remainlimits": 10,
 });
 // axios.post(`https://youtubedownloader10.azurewebsites.net/backend/syncDb`)

 saveToJsonFile(dataLimits, 'limits_download.json');
 // writeDataToDatabase(dataLimits, 'sessionCode')

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
