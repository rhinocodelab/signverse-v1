const { createServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')
const path = require('path')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0'  // Bind to all interfaces for remote access
const port = process.env.PORT || 9002

// Create Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// SSL certificate paths
const certDir = path.join(__dirname, '..', 'certs')
const keyPath = path.join(certDir, 'server.key')
const certPath = path.join(certDir, 'server.crt')

app.prepare().then(() => {
    // Check if SSL certificates exist
    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
        console.error('❌ SSL certificates not found!')
        console.error('Please run the SSL certificate generation script first:')
        console.error('  ./scripts/generate-ssl-cert.sh <YOUR_IP_ADDRESS>')
        process.exit(1)
    }

    // Read SSL certificates
    const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
    }

    // Create HTTPS server
    createServer(httpsOptions, async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true)
            await handle(req, res, parsedUrl)
        } catch (err) {
            console.error('Error occurred handling', req.url, err)
            res.statusCode = 500
            res.end('internal server error')
        }
    })
        .once('error', (err) => {
            console.error('❌ HTTPS Server Error:', err)
            process.exit(1)
        })
        .listen(port, hostname, () => {
            console.log('🚀 SignVerse Frontend HTTPS Server Ready!')
            console.log(`📍 Server running at: https://192.168.1.8:${port}`)
            console.log(`🔒 HTTPS enabled with self-signed certificate`)
            console.log(`🌐 Accessible from remote machines at: https://192.168.1.8:${port}`)
            console.log('')
            console.log('⚠️  Note: You may need to accept the self-signed certificate in your browser')
            console.log('⚠️  Note: Some browsers may show security warnings')
            console.log(`⚠️  Note: Make sure port ${port} is open in your firewall`)
        })
})
