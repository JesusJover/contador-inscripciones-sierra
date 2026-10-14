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

const eventoUrl = 'https://www.inscripcionesweb.es/es/evento/sierra26.zhtm?mostrar_inscritos=1'
const PLAZAS_TOTALES = 500
let plazasLibres = PLAZAS_TOTALES

const obtenerInscripcionesLibres = async (eventoUrl) => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox"],
    })
    let plazasRestantes
    try {
        const page = await browser.newPage()
        await page.goto(eventoUrl, {
            waitUntil: "domcontentloaded",
            timeout: 10000,
        })

        plazasRestantes = await page.evaluate((defaultTotal) => {
            // Estrategia 1: Selector clásico en .info_plazas si existiera un párrafo con las plazas libres
            const paragraphs = Array.from(document.querySelectorAll('.info_plazas > p'))
            const plazaP = paragraphs.find(p => {
                const html = p.innerHTML.toLowerCase()
                return html.split('</strong>').length >= 3 && (html.includes('plaza') || html.includes('libre'))
            })
            if (plazaP) {
                const elements = plazaP.innerHTML.split('</strong>')
                const parsed = parseInt(elements[2])
                if (!isNaN(parsed)) return parsed
            }

            // Estrategia 2: Conteo de la lista de inscritos (?mostrar_inscritos=1)
            const table = document.querySelector('table.table')
            if (table) {
                const rows = document.querySelectorAll('table.table tbody tr')
                const inscritos = rows.length
                const matchTotal = document.body.innerText.match(/LIMITE\s+INSCRITOS:\s*(\d+)/i)
                const total = matchTotal ? parseInt(matchTotal[1]) : defaultTotal
                return Math.max(0, total - inscritos)
            }

            return defaultTotal
        }, PLAZAS_TOTALES)
    } catch (e) {
        console.error(e)
    } finally {
        await browser.close()
    }
    return plazasRestantes
}

cron.schedule('*/15 * * * * *', async () => {
    try {
        const libres = await obtenerInscripcionesLibres(eventoUrl)
        if (libres !== undefined && !isNaN(libres)) {
            plazasLibres = libres
        }
    } catch (e) {
        console.error(e)
    }
    console.log(plazasLibres, new Date())
})

io.on('connection', (socket) => {
    console.log('connected socket')
    socket.emit('libres', plazasLibres)
    const task = cron.schedule('*/5 * * * * *', async () => {
        socket.emit('libres', plazasLibres)
    })
    socket.on('disconnect', () => {
        task.stop()
    })
})

httpServer.listen(4000)
