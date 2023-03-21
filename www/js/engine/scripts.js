var BTN_COMPANY = document.querySelector('#BtnCompany')
var BTN_QR = document.querySelector('#BtnQR')
var QR_NOTE = document.querySelector('#QR-note')
var TICKET_ID = document.querySelector('#txTicketID')
var SOURCE_BIN = document.querySelector('#txPrimBin')
var PART_NUM = document.querySelector('#txPartNum')
var PART_DESC = document.querySelector('#txPartDesc')
var PART_QTY = document.querySelector('#txPartQty')
var TARGET_BIN = document.querySelector('#txTransBin')
var qr = false
var arrData = []
var transferInProgress = false
var company
var db

document.addEventListener('deviceready', onDeviceReady, false)
document.addEventListener("backbutton", onBackKeyDown, false)

function onBackKeyDown() { }
function exitApp() { navigator.app.exitApp() }
function onDeviceReady() {
    document.querySelector('#badge-test').style.display = (BACKEND_URI.includes('TEST') === true) ? 'block' : 'none'
    //SOURCE_BIN.select()
    PART_NUM.setAttribute("disabled", true)
    PART_DESC.setAttribute("disabled", true)
    PART_QTY.setAttribute("disabled", true)
    TARGET_BIN.setAttribute("disabled", true)
    db = window.sqlitePlugin.openDatabase({
        name: 'invtransfer.db',
        location: 'default',
        androidDatabaseProvider: 'system'
    })
    app.sheet.open('.modal-empresas')
}

function radiobuttonActivo(elActivo) {
    const radios = document.querySelectorAll('.radio-start')
    for (let i = 0; i < radios.length; i++) {
        radios[i].checked = false
    }
    radios[elActivo].checked = true
}

BTN_COMPANY.addEventListener('click', mostrarListaUsuarios, false)

function mostrarListaUsuarios() {
    const companies = document.querySelectorAll('.radio-start')
    for (let i = 0; i < companies.length; i++) {
        if (companies[i].checked)
            company = companies[i].value
    }
    app.sheet.close('.modal-empresas')
    app.dialog.confirm(
        `¿Desea actualizar la lista de usuarios?`,
        `TraspasosMAC`,
        function () {
            syncUsers(company)
            conteoPendientes()
        },
        function () {
            addListaUsuarios()
            conteoPendientes()
        })
    execStatement(TABLE_ADVANCES)
}

async function conteoPendientes() {
    try {
        const h5 = document.querySelector('.conteo-pendientes')
        const req = await obtRegistrosPendientes()
        if (parseInt(req[0].Registros) > 0) {
            h5.innerHTML = `${req[0].Registros} registro(s)`
        } else {
            h5.innerHTML = 'Traspasos MAC'
        }
    } catch (error) {
        app.dialog.alert(`Info: ${error.message}`, `Method: guardarAvance`)
    }
}

async function addListaUsuarios() {
    try {
        var searchbar = app.searchbar.create({
            el: '.searchbar',
            searchContainer: '.listado',
            searchIn: '.elemento-listado',
            on: {
                search(sb, query, previousQuery) {
                    // console.log(query, previousQuery);
                }
            }
        });
        const lista = document.querySelector('.users-list')
        const users = await obtenerUsuarios(company)
        for (let i = 0; i < users.length; i++) {
            const el = `<li class="item-content" onclick="getUsername('${users[i].Username}');">
                            <div class="item-inner">
                                <div class="item-title elemento-listado">${users[i].Name}</div>
                            </div>
                        </li>`
            lista.insertAdjacentHTML('beforeend', el)
        }
        app.sheet.open('.modal-usuarios')
    } catch (error) {
        alert(error.message)
    }
}

function accionesMenu(option) {
    switch (option) {
        case 1:
            syncLocations(company)
            break;
        case 2:
            syncBarCodes(company)
            break;
        case 3:
            syncProducts(company)
            break;
        case 4:
            cleanDataBase()
            break;
        default:
            break;
    }
}

function actualizaListaDeUsuarios() {
    syncUsers(company)
    conteoPendientes()
}

function asignarLogoEmpresa() {
    let logo = document.querySelector('#logo-empresa')
    logo.src = (company == "DLMAC") ? "./img/Companies/DLMAC_Invert.png" : "./img/Companies/TTK.png"
}

async function getUsername(username) {
    try {
        const pwd = await validarUsuario(username)
        app.dialog.password(`Ingrese la contraseña del usuario: ${username}`, 'Confirmar usuario', function (password) {
            if (password == pwd[0].Password) {
                window.localStorage.setItem("CurrentUser", username)
                app.sheet.close()
                //SOURCE_BIN.focus()
            } else {
                showToast(`La contraseña escrita es incorrecta`)
            }
        });
    } catch (error) {
        app.dialog.alert(`${error.message}`, 'Method: getUsername')
    }
}

function preloaderClose() {
    preloader.close()
}

function preloaderWithCustomTitle(text = 'Traspasos MAC') {
    preloader = app.dialog.preloader(text)
}

async function envioDeAvances() {
    try {
        const req = await obtAvances()
        for (let i = 0; i < req.length; i++) {
            const x = await syncAdvance(req[i].id, req[i].SourceWhse, req[i].SourceBin, req[i].TargetWhse, req[i].TargetBin, req[i].PartNum, req[i].TransferQty, req[i].UserName, req[i].FechaGuardado, req[i].TicketID)
        }
        await conteoPendientes()
    } catch (error) {
        app.dialog.alert(`Info: ${error.message}`, 'Method: envioDeAvances')
    }
}

SOURCE_BIN.addEventListener('keyup', function (ev) {
     if (ev.keyCode == 13){
        switch (qr) {
            case true:
                validarQR(this)
                break;
            case false:
                validarUbicacion(this)
                break;
        }
    }
})


BTN_QR.addEventListener('click', () => {
    QRActive()
})

TARGET_BIN.addEventListener('keyup', function (ev) {
    this.value = this.value.toUpperCase()
    if (ev.keyCode == 13)
        validarUbicacion(this, 1)
})

PART_NUM.addEventListener('keyup', function (ev) {
    this.value = this.value.toUpperCase()
    if (ev.keyCode == 13)
        validarProducto(this)
})

PART_QTY.addEventListener('keyup', function (ev) {
    if (ev.keyCode == 13) {
        //HOTFIX: [2020-08-08] - Se omite la validación de existencia para las ubicaciones INV
        if (arrData[0].SourceWhse == "INV")
            omiteExistenciaINV(this)
        else
            validarCantidad(this)
    }
})

document.querySelector('#textToSearch').addEventListener('keyup', function (ev) {
    if (ev.keyCode == 13) {
        const inputText = document.querySelector('#textToSearch')
        if (inputText.value.length > 0) {
            app.preloader.show()
            searchProduct(company,inputText.value)
            inputText.value = ""
        }
        else {
            showToast(`Por favor, ingrese un texto válido`)
        }
    }
})

document.querySelector('.btnSearchProduct').addEventListener('click', function (ev) {
    const inputText = document.querySelector('#textToSearch')
    if (inputText.value.length > 0) {
        app.preloader.show()
        searchProduct(company,inputText.value)
        inputText.value = ""
    }
    else {
        showToast(`Por favor, ingrese un texto válido`)
    }
})

async function validarUbicacion(input, type = 0) {
    try {
        const isValid = await consultarUbicacion(input.value)
        if (isValid.length > 0) {
            let source = []
            if (type == 0) {
                input.setAttribute("disabled", true)
                PART_NUM.removeAttribute("disabled")
                arrData.push({
                    SourceWhse: isValid[0].WarehouseCode,
                    SourceBin: isValid[0].BinNum
                })
                PART_NUM.select()
                PART_NUM.focus()
            } else {
                //HOTFIX: [2020-08-08] - Se agrega validación para evitar registrar la misma ubicación como origen y destino
                if (arrData[0].SourceWhse.toUpperCase() == isValid[0].WarehouseCode.toUpperCase() && arrData[0].SourceBin.toUpperCase() == isValid[0].BinNum.toUpperCase()) {
                    app.dialog.alert(`La ubicación origen ${arrData[0].SourceBin} y destino ${input.value} son las mismas, ingrese otra por favor`, `Ubicación inválidad`, () => { TARGET_BIN.value = ''; TARGET_BIN.focus(); })
                } else {
                    input.setAttribute("disabled", true)
                    arrData.push({
                        TargetWhse: isValid[0].WarehouseCode,
                        TargetBin: isValid[0].BinNum
                    })
                }
            }
        } else {
            app.dialog.alert(`Ingrese una ubicación válida para continuar.`, `Ubicación inválida`, function () { input.select() })
        }
    } catch (error) {
        app.dialog.alert(`${error.message}`, `Method: validar Ubicacion`)
    }
}

async function validarProducto(input) {
    try {
        const isValid = await consultarProducto(input.value)
        if (isValid.length > 0) {
            let part = []
            input.setAttribute("disabled", true)
            PART_QTY.removeAttribute("disabled")
            PART_QTY.select()
            arrData.push({
                PartNum: isValid[0].PartNum,
                PartDesc: isValid[0].PartDesc
            })
            PART_NUM.value = isValid[0].PartNum
            PART_DESC.value = isValid[0].PartDesc
            document.querySelector('#txIUM').innerHTML = isValid[0].IUM
        } else {
            app.dialog.alert(`El código o número de parte no existe.`, `Producto inválido`, function () { input.select() })
        }
    } catch (error) {
        app.dialog.alert(`${error.message}`, `Method: validar producto`)
    }
}

async function validarCantidad(input) {
    const existencia = await syncExistencia(company, arrData[0].SourceWhse, arrData[0].SourceBin, arrData[1].PartNum)
    if (input.value.length > 0 && parseFloat(input.value) > 0) {
        if (existencia[0].flag === true && parseFloat(input.value) <= parseFloat(existencia[0].cant)) {
            if (qr === true) {
                arrData[2].PartQty = input.value
                PART_QTY.setAttribute("disabled", true)
                TARGET_BIN.focus()
            } else {
                input.setAttribute("disabled", true)
                document.querySelector('#txUbicPrimaria').innerHTML = existencia[0].ubic
                TARGET_BIN.removeAttribute("disabled")
                TARGET_BIN.select()
                arrData.push({ PartQty: input.value })
            }
        } else if (existencia[0].flag === true && parseFloat(input.value) > parseFloat(existencia[0].cant)) {
            app.dialog.alert(`La cantidad ingresada (${input.value}) supera la existencia en la ubicación (${existencia[0].cant})`, `Producto sin existencia`, function () { input.select() })
        } else {
            app.dialog.alert(`El producto ${arrData[1].PartNum} no tiene existencia en la ubicación ${arrData[0].SourceBin}`, `Producto sin existencia`)
        }
    } else {
        app.dialog.alert(`La cantidad debe ser mayor a cero.`, `Cantidad inválida`, function () { input.select() })
    }
}

//HOTFIX: [2020-08-08] - Se omite la validación de existencia para las ubicaciones INV
async function omiteExistenciaINV(input) {
    if (input.value.length > 0 && parseFloat(input.value) > 0) {
        input.setAttribute("disabled", true)
        // document.querySelector('#txUbicPrimaria').innerHTML = ""
        TARGET_BIN.removeAttribute("disabled")
        TARGET_BIN.select()
        arrData.push({ PartQty: input.value })
    } else {
        app.dialog.alert(`La cantidad debe ser mayor a cero.`, `Cantidad inválida`, function () { input.select() })
    }
}

function seleccionParte(PartNum, PartDesc, IUM, PrimBin) {

   // console.log("Entre a seleccionar parte")

    app.dialog.confirm(`¿Está seguro de elegir el producto ${PartNum}?`, `Confirmar producto`, function () {
        PART_NUM.value = PartNum
        PART_NUM.parentElement.parentElement.parentElement.classList.add("item-input-with-value")
        PART_NUM.setAttribute("disabled", true)
        PART_QTY.removeAttribute("disabled")
        //PART_QTY.select()
        arrData.push({
            PartNum: PartNum,
            PartDesc: PartDesc
        })
        PART_DESC.value = PartDesc
        document.querySelector('#txIUM').innerHTML = IUM
        document.querySelector('#txUbicPrimaria').innerHTML = PrimBin
        document.querySelector('.lista_encontrados').innerHTML = ""
        document.querySelector('#textToSearch').value = ""
        app.sheet.close('.modal-busqueda')
    })
}


async function guardadAvance() {
    try {
        enableDisableButton()
        if (arrData.length == 4 & transferInProgress === false) {
            const ticket = (TICKET_ID.value.length > 0) ? TICKET_ID.value : 0
            const req = await guardarAvance(ticket)
            if (parseInt(req[0].ReturnID) > 0) {
                app.dialog.alert(`Se ha guardado el movimiento`, `Registro guardado`, cleanInputs)
                conteoPendientes()
            }
            else
                app.dialog.alert(`No se pudo guardar el movimiento`, `Registro no guardado`, () => { enableDisableButton(false) })
        } else {
            showToast('Por favor, termine de capturar toda la información.')
            enableDisableButton(false)
        }
        await envioDeAvances() //Envío automático de avance
    } catch (error) {
        app.dialog.alert(`Info: ${error.message}`, `Method: guardarAvance`, () => { enableDisableButton(false) })
    }
}

function cleanInputs() {
    const el = document.querySelectorAll('.el-editable')
    for (let i = 0; i < el.length; i++)
        el[i].value = ""

    TICKET_ID.value = ""
    PART_NUM.setAttribute("disabled", true)
    PART_QTY.setAttribute("disabled", true)
    PART_DESC.setAttribute("disabled", true)
    TARGET_BIN.setAttribute("disabled", true)
    SOURCE_BIN.removeAttribute("disabled")
    //SOURCE_BIN.select()
    document.querySelector('#txIUM').innerHTML = ""
    document.querySelector('#txUbicPrimaria').innerHTML = "Ubicación"
    arrData = []
    enableDisableButton(false)
    SOURCE_BIN.focus()
}


function cierreModalBusqueda() {
    document.querySelector('.lista_encontrados').innerHTML = ""
    document.querySelector('#textToSearch').value = ""
    app.sheet.close('.modal-busqueda')
}

function showToast(text, position = 'center', delay = 2000) {
    const toast = app.toast.create({
        text: text,
        position: position,
        closeTimeout: delay,
    })
    toast.open()
}

function openModalBusqueda() {
    const searchInput = document.querySelector('#textToSearch')
    searchInput.value = ""
    searchInput.select()
}

function enableDisableButton(Type = true, ButtonId = '#BtnSaveMovement') {
    const CURRENT_BUTTON = document.querySelector(ButtonId)
    if (Type) {
        CURRENT_BUTTON.classList.replace('color-red', 'color-gray')
        CURRENT_BUTTON.setAttribute('disabled', true)
    }
    else {
        CURRENT_BUTTON.removeAttribute('disabled')
        CURRENT_BUTTON.classList.replace('color-gray', 'color-red')
    }
}
// [2021-02-02] v1.1.0 - Funcionalidad de escaneo por QR
function QRActive() {
    switch (qr) {
        case true:
            BTN_QR.classList.remove('button-fill')
            BTN_QR.classList.remove('color-orange')
            BTN_QR.innerText = 'Código QR'
            QR_NOTE.style.display = 'none'
            qr = false
            break;
        case false:
            BTN_QR.classList.add('button-fill')
            BTN_QR.classList.add('color-orange')
            BTN_QR.innerText = 'QR activo'
            QR_NOTE.style.display = 'block'
            qr = true
            break;
    }
    cleanInputs()
    SOURCE_BIN.focus()
}

async function validarQR(input) {
    //Elementos del código
     //0) idEtiqueta,  1) AlmacenOrigen,   2) UbicaciónOrigen,     
    // 3) Parte,       4) Cantidad,        5) AlmacenDestino
    // 6) UbicaciónDestino
    const elements = input.value.toString().split('|')
    //console.log(elements)
    if (elements.length == 7) {
        const onHandQtyResponse = await syncExistencia(company, elements[1], elements[2], elements[3])
        const arrProducto = isValid = await consultarProducto(elements[3])
        switch (onHandQtyResponse[0].flag) {
            case true:
                if (parseFloat(onHandQtyResponse[0].cant) >= parseFloat(elements[4])) {
                    TICKET_ID.value = elements[0]
                    SOURCE_BIN.value = elements[2]
                    PART_NUM.value = elements[3]
                    PART_DESC.value = arrProducto[0].PartDesc
                    PART_QTY.value = elements[4]
                    TARGET_BIN.value = elements[6]

                    arrData.push({
                        TicketID: elements[0],
                        SourceWhse: elements[1],
                        SourceBin: elements[2]
                    })
                    arrData.push({
                        PartNum: elements[3],
                        PartDesc: arrProducto[0].PartDesc
                    })
                    arrData.push({
                        PartQty: parseFloat(elements[4])
                    })
                    arrData.push({
                        TargetWhse: elements[5],
                        TargetBin: elements[6]
                    })
                    PART_QTY.removeAttribute("disabled")
                    PART_QTY.focus()
                } else {
                    app.dialog.alert(
                        `La cantidad de traspaso ${elements[4]} es mayor a la existencia en la ubicación origen (${onHandQtyResponse[0].cant})`
                        , 'Existencia insuficiente'
                        , cleanInputs)
                }
                break;

            case false:
                showToast(`Error de conexión al servidor Epicor`)
                break;
        }
        // 0: {SourceWhse: "CZ", SourceBin: "DEF"}
        // 1: {PartNum: "390041", PartDesc: "Lija oxido aluminio grano 36 x-86(25)+"}
        // 2: {PartQty: "1"}
        // 3: {TargetWhse: "DLMAC", TargetBin: "GEN"}
    } else {
        showToast(`El código ingresado no tiene el formato correcto.`)
    }
}