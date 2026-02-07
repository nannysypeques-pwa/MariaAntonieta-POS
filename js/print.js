/**
 * Print Service
 * Handles Ticket Printing
 */

const Printer = {

    // Print Ticket
    printTicket: function (sale) {
        const ticketWindow = window.open('', 'PRINT', 'height=600,width=400');

        const itemsHtml = sale.items.map(item => `
            <tr>
                <td>${item.nombreProducto || item.idProducto}</td>
                <td style="text-align:center">${item.cantidad}</td>
                <td style="text-align:right">$${parseFloat(item.precioUnitario).toFixed(2)}</td>
            </tr>
        `).join('');

        ticketWindow.document.write(`
            <html>
                <head>
                    <title>Ticket # ${sale.idVenta}</title>
                    <style>
                        body {
                            font-family: 'Courier New', monospace;
                            width: 300px;
                            margin: 0;
                            padding: 10px;
                            font-size: 12px;
                        }
                        .header, .footer {
                            text-align: center;
                            margin-bottom: 10px;
                        }
                        .divider {
                            border-top: 1px dashed black;
                            margin: 10px 0;
                        }
                        table {
                            width: 100%;
                        }
                        .totals {
                            text-align: right;
                            margin-top: 10px;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>PASTELERÍA</h2>
                        <p>Sucursal Central</p>
                        <p>${new Date().toLocaleString()}</p>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th style="text-align:left">Prod</th>
                                <th>Cant</th>
                                <th style="text-align:right">$$</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                    
                    <div class="divider"></div>
                    
                    <div class="totals">
                        <p>Subtotal: $${parseFloat(sale.subtotal || sale.total).toFixed(2)}</p>
                        <p>Descuento: $${parseFloat(sale.descuento || 0).toFixed(2)}</p>
                        <h3>TOTAL: $${parseFloat(sale.total).toFixed(2)}</h3>
                        <p>Pago: ${sale.metodoPago || 'Efectivo'}</p>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <div class="footer">
                        <p>¡Gracias por su compra!</p>
                        <p>Ticket: ${sale.idVenta}</p>
                    </div>
                </body>
            </html>
        `);

        ticketWindow.document.close();
        ticketWindow.focus();

        // Auto print after loading
        setTimeout(() => {
            ticketWindow.print();
            ticketWindow.close();
        }, 500);
    }
};

// Expose to window
window.Printer = Printer;
