import puppeteer from 'puppeteer'
import cron from 'node-cron'
import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
});

const eventoUrl = 'https://www.inscripcionesweb.es/es/evento/metasport2024.zhtm'
let plazasLibres = 0

const obtenerInscripcionesLibres = async (eventoUrl) => {
    const browser = await puppeteer.launch({
        headless: "new",
        defaultViewport: null,
    })
    let plazasRestantes
    try {
        const page = await browser.newPage()
        await page.goto(eventoUrl, {
            waitUntil: "domcontentloaded",
        })

        await page.waitForSelector('.info_plazas')
        const plazasOcupadas = await page.evaluate(() => {
            const plazasOcupadas = document.querySelector('.info_plazas > p').innerHTML
            return plazasOcupadas
        })
        const elements = plazasOcupadas.split('</strong>')
        plazasRestantes = parseInt(elements[2])
    } catch (e) {
        console.error(e)
    } finally {
        await browser.close()
    }
    return plazasRestantes
}

// const plazasOcupadas = obtenerInscripcionesLibres(eventoUrl, plazasTotales)
// // Wait for the promise to resolve
// plazasOcupadas.then(plazasOcupadas => {
//     console.log(plazasOcupadas)
// })

cron.schedule('*/15 * * * * *', async () => {
    plazasLibres = await obtenerInscripcionesLibres(eventoUrl)
    console.log(plazasLibres, new Date())
})

io.on('connection', (socket) => {
    console.log('connected socket')
    cron.schedule('*/5 * * * * *', async () => {
        // const plazasLibres = await obtenerInscripcionesLibres(eventoUrl)
        socket.emit('libres', plazasLibres)
        // console.log(plazasLibres, new Date())
    })
})

httpServer.listen(4000)