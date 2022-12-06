const BACKEND_URI = `http://b2b.mayoreocardenas.com:8081/Pick&Pack/traspasos/filename` //Ambiente Productivo
// const BACKEND_URI = `http://b2b.mayoreocardenas.com:8081/Pick&PackTEST/traspasos/filename` //Ambiente TEST

async function goRequest(url) {
    const response = await fetch(url).then(requestResolve).catch(requestReject)
    const data = await response.json()
    return data
}

function requestResolve(response) {
    if(response.ok) {
        return response //response.text().then(showResult);
    } else {
        showError('status code: ' + response.status);
        return false;
    }
}

function requestReject(err) {
    console.log(err.message)
}

async function syncBarCodes(company) {
    try {
        preloaderWithCustomTitle('Importando códigos de barra')
        const req = await goRequest(BACKEND_URI.replace('filename', `syncCodigos.php?company=${company}`))
        execStatement("DROP TABLE IF EXISTS codigosdebarra")
        let values = "INSERT OR REPLACE INTO codigosdebarra(PartNum, ConvFactor, UOMCode, ProdCode) VALUES"
        execStatement(TABLE_BARCODES)
        for (let i = 0; i < req.length; i++) {
            const part = req[i][0]
            const qty  = req[i][1]
            const uom  = req[i][2]
            const code = req[i][3]
            values += `('${part}', ${qty}, '${uom}', '${code}'),`
        }
        execStatement(values.substring(0, values.length-1))
        preloaderClose()
        app.dialog.alert(`${req.length} códigos actualizados`, `Importar códigos`)
    } catch (error) {
        preloaderClose()
        app.dialog.alert(error.message, 'Method: syncBarCodes')
    }
}

async function syncLocations(company) {
    try {
        preloaderWithCustomTitle('Importando ubicaciones')
        const req = await goRequest(BACKEND_URI.replace('filename', `syncUbicaciones.php?company=${company}`))
        execStatement("DROP TABLE IF EXISTS ubicaciones")
        let values = "INSERT OR REPLACE INTO ubicaciones(WarehouseCode, BinNum) VALUES"
        execStatement(TABLE_LOCATIONS)
        for (let i = 0; i < req.length; i++) {
            const whse = req[i][0]
            const bin  = req[i][1]
            values += `('${whse}', '${bin}'),`
        }
        execStatement(values.substring(0, values.length-1))
        preloaderClose()
        app.dialog.alert(`${req.length} ubicaciones actualizadas`, `Importar ubicaciones`)
    } catch (error) {
        preloaderClose()
        app.dialog.alert(error.message, 'Method: syncLocations')
    }
}

async function syncProducts(company) {
    try {
        preloaderWithCustomTitle('Importando productos')
        const req = await goRequest(BACKEND_URI.replace('filename', `syncProductos.php?company=${company}`))
        execStatement("DROP TABLE IF EXISTS productos")
        let values = "INSERT OR REPLACE INTO productos(PartNum, PartDesc, IUM) VALUES"
        execStatement(TABLE_PARTS)
        for (let i = 0; i < req.length; i++) {
            const part = req[i][0]
            const desc = req[i][1]
            const ium  = req[i][2]
            values += `('${part}', '${desc}', '${ium}'),`
        }
        execStatement(values.substring(0, values.length-1))
        preloaderClose()
        app.dialog.alert(`${req.length} productos actualizados`, `Importar productos`)
    } catch (error) {
        preloaderClose()
        app.dialog.alert(error.message, 'Method: syncProducts')
    }
}

async function syncUsers(company) {
    try {
        preloaderWithCustomTitle('Actualizando usuarios')
        const req = await goRequest(BACKEND_URI.replace('filename', `syncUsuarios.php?company=${company}`))
        execStatement("DROP TABLE IF EXISTS usuarios")
        let values = "INSERT OR REPLACE INTO usuarios(Username, Name, Password, CompanyList) VALUES"
        execStatement(TABLE_USERS)
        for (let i = 0; i < req.length; i++) {
            const id   = req[i][0]
            const name = req[i][1]
            const pass = req[i][2]
            const comp = req[i][3]
            values += `('${id}', '${name}', '${pass}', '${comp}'),`
        }
        execStatement(values.substring(0, values.length-1))
        preloaderClose()
        addListaUsuarios()
    } catch (error) {
        preloaderClose()
        app.dialog.alert(error.message, 'Method: syncUsers')
    }
}

async function syncAdvance(id, SourceWhse, SourceBin, TargetWhse, TargetBin, PartNum, TransferQty, UserName, FechaGuardado, TicketID) {
    try {
        const networkState = navigator.connection.type
        if (networkState !== Connection.NONE) {
            let uri = `enviarTarea.php?whsex=${SourceWhse}&binx=${SourceBin}&whsey=${TargetWhse}&biny=${TargetBin}&part=${PartNum}&qty=${TransferQty}&user=${UserName}&date=${FechaGuardado}&ticket=${TicketID}`
            const req = await goRequest(BACKEND_URI.replace('filename', uri))
            if (req.includes("SQLSTATE") === true) {
                app.dialog.alert(`id: ${id} Msg: ${req[0][2]}`, `Error al registrar movimiento`)
            } else if (req[0][0] == 1) {
                execStatement(`UPDATE registrostraspasos SET Exported = 1 WHERE id = ${id};`)
                var toastLargeMessage = app.toast.create({
                    text: `Registro enviado correctamente!!`,
                    closeTimeout: 2000,
                });
                toastLargeMessage.open()
            } else {
                app.dialog.alert(`id: ${id} Msg: ${req[0][1]}-${req[0][2]}`, `Registro no guardado`)
            }
        } else {
            app.dialog.alert(`No tiene conexión a internet.`, `Sin conexión`)
        }
    } catch (error) {
        app.dialog.alert(error.message, 'Method: syncAdvance')
    }
}

async function syncExistencia(Company, Warehouse, BinNum, PartNum) {
    let data = [] 
    try {
        const networkState = navigator.connection.type
        if (networkState !== Connection.NONE) {
            const uri = `syncExistencia.php?comp=${Company}&whse=${Warehouse}&bin=${BinNum}&part=${PartNum}`
            const req = await goRequest(BACKEND_URI.replace('filename', uri))
            if (req.length > 0) {
                if (req[0][0].includes("SQLSTATE") === true) {
                    app.dialog.alert(`Info: ${req[0][2]}`, `Error al consultar existencia`)
                    data.push({
                        flag: false,
                        cant: -1
                    })
                } else {
                    data.push({
                        flag: true,
                        cant: req[0][0],
                        ubic: req[0][1]
                    })
                }
            } else {
                data.push({
                    flag: false,
                    cant: -1
                })
            }
        } else {
            app.dialog.alert(`No tiene conexión a internet.`, `Method: syncExistencia`)
        }
        return data
    } catch (error) {
        app.dialog.alert(`Info: ${error.message}`, `Method: syncExistencia`)
        data.push({
            flag: false,
            cant: -1
        })
        return data
    }
}

async function searchProduct(company, searchText) {
    let data = []
    try {
        const uri = BACKEND_URI.replace('filename', `searchproduct.php?text=${searchText}&company=${company}`)
        const req = await goRequest(uri)
        if (req.length > 0) {
            if (req[0][0].toString().includes("SQLSTATE") === true) {
                app.preloader.hide()
                app.dialog.alert(`Info SQL: ${req[0][2]}`, `Error al buscar producto`)
            }
            else {
                const lista_resultados = document.querySelector('.lista_encontrados')
                lista_resultados.innerHTML = ""
                for (let i in req) {
                    const el = `<li onclick="seleccionParte('${req[i][0]}', '${req[i][1].toString().replace(/"|'/g," pulgadas")}', '${req[i][2]}', '${req[i][3]}');">
                                    <a href="#" class="item-link item-content">
                                        <div class="item-inner">
                                            <div class="item-title-row">
                                                <div class="item-title">Código: ${req[i][0]}</div>
                                                <div class="item-after">Medida: ${req[i][2]}</div>
                                            </div>
                                            <div class="item-subtitle">Ubic Primaria: ${req[i][3]}</div>
                                            <div class="item-text">${req[i][1]}</div>
                                        </div>
                                    </a>
                                </li>`
                    lista_resultados.insertAdjacentHTML('beforeend', el)
                }
                app.preloader.hide()
            }
        } else {
            const lista_resultados = document.querySelector('.lista_encontrados')
            lista_resultados.innerHTML = `<li>
                                                <a href="#" class="item-link item-content">
                                                    <div class="item-inner">
                                                        <div class="item-text">No se encontraron resultados</div>
                                                    </div>
                                                </a>
                                            </li>`
            app.preloader.hide()
        }

    } catch (error) {
        app.preloader.hide()
        app.dialog.alert(error.message, `Method: searchProduct`)
    }
}