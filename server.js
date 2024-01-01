const express = require('express');
const fs = require('fs/promises');
const ytdl = require('ytdl-core');

const app = express();
const port = 3000;
const host = '0.0.0.0';

app.use(express.json());

app.get('/', (req, res) => {
 res.send('Path no found')
})

app.post('/adddata', async (req, res) => {
  const { dataToAdd } = req.body;

  try {
    // Baca file JSON yang telah disimpan di server 2
    const data = await fs.readFile('data_server2.json', 'utf-8');
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
  await fs.writeFile('data_server2.json', JSON.stringify(dataToSave));
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
    const data = await fs.readFile('data_server2.json', 'utf-8');
    let jsonData = JSON.parse(data);

    // Filter data berdasarkan path yang akan dihapus
    jsonData = jsonData.filter(item => item.path !== dataToDelete.path);

    // Simpan data yang telah dihapus kembali ke dalam file JSON
    await fs.writeFile('data_server2.json', JSON.stringify(jsonData, null, 2));

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
  const data = await fs.readFile('data_server2.json', 'utf-8');

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
  await fs.writeFile('data_server2.json', JSON.stringify(dataArray, null, 2));
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
  const data = await fs.readFile('data_server2.json', 'utf-8');
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
  const data = await fs.readFile('data_server2.json', 'utf-8');
  const jsonData = JSON.parse(data);
  console.log('Data berhasil dibaca di Server 2:', jsonData);
  res.json(jsonData);
 } catch (error) {
  console.error(error);
  res.status(500).send('Terjadi kesalahan saat membaca data di Server 2');
 }
});

// DOWNLOADER
app.get('/download/yt/:formatConvert/:formatOriginal/:indexData', async (req, res) => {
 const { formatConvert, formatOriginal, indexData } = req.params
 const { urlVideo } = req.query
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

  // console.log(getDataByValue(`${formatOriginal};${indexData}`))
 if (infoFormat1 && getDataByValue(`${formatOriginal};${indexData}`)) {
   if (getDataByValue(`${formatOriginal};${indexData}`).audioTrack) {
    res.header('Content-Disposition', `attachment; filename="(${getDataByValue(`${formatOriginal};${indexData}`).audioTrack.displayName}) ${info.videoDetails.title}.${formatConvert}"`);
   } else {
    res.header('Content-Disposition', `attachment; filename="${info.videoDetails.title}.${formatConvert}"`);
   }
  await ytdl(urlVideo, { format: getDataByValue(`${formatOriginal};${indexData}`) }).pipe(res);
  res.redirect('https://downloader.marsell.tech/?nextState=done')
  // getDataByValue(`${formatOriginal};${indexData}`).url
  // let aTag = document.createElement('a')
  // aTag.href = 
  // fetch(getDataByValue(`${formatOriginal};${indexData}`).url).then(res => res.blob()).then(file => {
  //  let tempUrl = URL.createObjectURL(file);
  //  console.log(tempUrl)
  // })
  // res.redirect('/')
 } else {
  res.redirect('/?error=url_process_error')
 }
})

app.listen(port, host, () => {
 console.log(`Server 2 berjalan di http://localhost:${port}`);
});
