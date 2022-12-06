const TABLE_BARCODES = `CREATE TABLE IF NOT EXISTS codigosdebarra (id integer primary key autoincrement, PartNum varchar, ConvFactor decimal, UOMCode varchar, ProdCode varchar);`
const TABLE_LOCATIONS= `CREATE TABLE IF NOT EXISTS ubicaciones(id integer primary key autoincrement, WarehouseCode varchar, BinNum vrchar);`
const TABLE_PARTS    = `CREATE TABLE IF NOT EXISTS productos(id integer primary key autoincrement, PartNum varchar, PartDesc text, IUM varchar);`
const TABLE_USERS    = `CREATE TABLE IF NOT EXISTS usuarios(id integer primary key autoincrement, Username varchar, Name varchar, Password varchar, CompanyList varchar);`
const TABLE_ADVANCES = `CREATE TABLE IF NOT EXISTS RegistrosTraspasos( id integer primary key autoincrement, SourceWarehouse VARCHAR(30) NULL, SourceBinNum VARCHAR(60) NULL, TargetWarehouse VARCHAR(30) NULL, TargetBinNum VARCHAR(60) NULL, PartNum VARCHAR(60) NULL, TransferQty DECIMAL(10,2) NULL, UserName VARCHAR(60) NULL, FechaGuardado DATETIME NULL, Exported BIT NULL, FolioEtiquetaDevoluciones INT NULL);`
const SAVE_ADVANCE   = `INSERT INTO RegistrosTraspasos(SourceWarehouse, SourceBinNum, TargetWarehouse, TargetBinNum, PartNum, TransferQty, UserName, FechaGuardado, Exported, FolioEtiquetaDevoluciones) VALUES(?, ?, ?, ?, ?, ?, ?, DATETIME('now','localtime'), 0, ?);`
const CLEAN_EXPORTED = `DELETE FROM RegistrosTraspasos WHERE Exported = 1;`

function cleanDataBase() {
    app.dialog.confirm(
        `¿Desea eliminar todos los datos locales?`, 
        `TraspasosMAC`, 
        function() {
            execStatement("DROP TABLE IF EXISTS codigosdebarra")
            execStatement(TABLE_BARCODES)

            execStatement("DROP TABLE IF EXISTS ubicaciones")
            execStatement(TABLE_LOCATIONS)

            execStatement("DROP TABLE IF EXISTS productos")
            execStatement(TABLE_PARTS)

            execStatement("DROP TABLE IF EXISTS usuarios")
            execStatement(TABLE_USERS)

            execStatement("DROP TABLE IF EXISTS registrostraspasos")
            execStatement(TABLE_ADVANCES)
        }
    )
}

function customQuery(statement) {
    db.transaction(function(tx) {
        tx.executeSql(
        `${statement}`, 
        [],
        function(tx, res) {
            //console.log(res);
        })
    })
}

function testQuery(statement) {
    let data = []
    return new Promise((resolve, reject) => {
        db.transaction(function(tx) {
            tx.executeSql(`${statement}`, [], function(tx, res) {
                resolve(res)
            }, function(tx, error) {
                reject(Error(error.message))
            });
        });
    })
    return data
}

function execStatement(statement) {
    db.transaction(function(tx) {
        tx.executeSql(`${statement}`, [], function(tx, res) {
            // console.log("insertId: " + res.insertId + " -- probably 1");
            // console.log("rowsAffected: " + res.rowsAffected + " -- should be 1");
            // console.log("res.rows.length: " + res.rows.length + " -- should be 1");
            // console.log("res.rows.item(0).cnt: " + res.rows.item(0).username + " -- should be 1");
            //console.log(res);
        }, function(tx, error) {
            //console.log("ERROR: " + error.message);
            console.log(error.message, "SQLiteException")
        });
    });
}

async function consultarUbicacion(BinNum) {
    return new Promise((resolve, reject) => {
        let data = []
        db.transaction(function(tx) {
            tx.executeSql(`SELECT WarehouseCode, BinNum FROM ubicaciones WHERE BinNum = ?`, [BinNum], 
            function(tx, res) {
                if (res.rows.length > 0) {
                    if (res.rows.length > 1) {
                        let wh = ""
                        for (let j = 0; j < res.rows.length; j++) {
                            wh += `${res.rows.item(j).WarehouseCode},`
                        }
                        app.dialog.prompt('Ingrese el almacén', `Almacenes: ${wh.substring(0, wh.length-1)}`, function(whse) {
                            if (wh.includes(whse.toUpperCase()) === true) {
                                data.push({
                                    isValida: true,
                                    WarehouseCode: whse.toUpperCase(),
                                    BinNum: res.rows.item(0).BinNum
                                })    
                            }
                            resolve(data)
                        }, function() {});
                    } else {
                        data.push({
                            isValida: true,
                            WarehouseCode: res.rows.item(0).WarehouseCode,
                            BinNum: res.rows.item(0).BinNum
                        })
                        resolve(data)
                    }
                }
                else
                    resolve(data)
            }, function(tx, error) {
                app.dialog.alert(`Detalles: ${error.message}`, "SQLiteMethod: obtUbicacionValida")
                reject(data)
            });
        });
    })
}

async function consultarCodigoDeBarras(ProdCode) {
    return new Promise((resolve, reject) => {
        let data = []
        db.transaction(function(tx) {
            tx.executeSql(`SELECT PartNum FROM codigosdebarra WHERE PartNum = ? OR ProdCode = ?`, [ProdCode, ProdCode], 
            function(tx, res) {
                if (res.rows.length > 0) {
                    data.push({
                        PartNum: res.rows.item(0).PartNum
                    })
                    resolve(data)
                }
                else
                    resolve(data)
            }, function(tx, error) {
                app.dialog.alert(`Detalles: ${error.message}`, "SQLiteMethod: ConsultarCodigoDeBarras")
                reject(data)
            });
        });
    })
}

async function consultarProducto(ProdCode) {
    const arrBarCode = await consultarCodigoDeBarras(ProdCode)
    const numParte = (arrBarCode.length > 0) ? arrBarCode[0].PartNum : ProdCode
    return new Promise((resolve, reject) => {
        let data = []
        db.transaction(function(tx) {
            tx.executeSql(`SELECT PartNum, PartDesc, IUM FROM productos WHERE PartNum = ?`, [numParte], 
            function(tx, res) {
                if (res.rows.length > 0) {
                    const _partnum = (arrBarCode.length > 0) ? arrBarCode[0].PartNum : ''
                    data.push({
                        isValida: true,
                        PartNum: (_partnum.length > 0) ? _partnum : res.rows.item(0).PartNum,
                        PartDesc: res.rows.item(0).PartDesc,
                        IUM: res.rows.item(0).IUM
                    })
                    resolve(data)
                }
                else
                    resolve(data)
            }, function(tx, error) {
                app.dialog.alert(`Detalles: ${error.message}`, "SQLiteMethod: obtUbicacionValida")
                reject(data)
            });
        });
    })
}

async function obtenerUsuarios(company) {
    return new Promise((resolve, reject) => {
        let data = []
        db.transaction(function(tx) {
            tx.executeSql(`SELECT Username, Name FROM usuarios WHERE CompanyList LIKE '%${company}%';`, [], 
            function(tx, res) {
                if (res.rows.length > 0) {
                    for (let i = 0; i < res.rows.length; i++) {
                        data.push({
                            Username: res.rows.item(i).Username,
                            Name: res.rows.item(i).Name
                        })
                        resolve(data)
                    }
                } else
                    resolve(data)
            }, function(tx, error) {
                app.dialog.alert(`Detalles: ${error.message}`, "SQLiteMethod: obtenerUsuarios")
                reject(data)
            })
        })
    })
}

async function guardarAvance(Ticket = 0) {
    return new Promise((resolve, reject) => {
        let data = []
        let fecha = "datetime(\'now\', \'localtime\')"
        db.transaction(function(tx) {
            tx.executeSql(
                SAVE_ADVANCE, 
                [
                    arrData[0].SourceWhse, 
                    arrData[0].SourceBin, 
                    arrData[3].TargetWhse, 
                    arrData[3].TargetBin, 
                    arrData[1].PartNum, 
                    arrData[2].PartQty, 
                    window.localStorage.getItem("CurrentUser"),
                    Ticket
                ], 
            function(tx, res) {
                if (res.rowsAffected > 0) {
                    data.push({
                        ReturnID: res.insertId
                    })
                    resolve(data)
                } else {
                    data.push({
                        ReturnID: 0
                    })
                    resolve(data)
                }
            }, function(tx, error) {
                app.dialog.alert(`Detalles: ${error.message}`, "SQLiteMethod: obtenerUsuarios")
                reject(0)
            })
        })
    })
}

async function obtRegistrosPendientes() {
    return new Promise((resolve, reject) => {
        let data = []
        db.transaction(function(tx) {
            tx.executeSql(`SELECT COUNT(id) Registros FROM registrostraspasos WHERE Exported = 0;`, [], 
            function(tx, res) {
                tx.executeSql(`${CLEAN_EXPORTED}`, []); //[2020-12-21] - Depuración de registros ya exportados.
                if (res.rows.length > 0) {
                    for (let i = 0; i < res.rows.length; i++) {
                        data.push({
                            Registros: res.rows.item(i).Registros
                        })
                        resolve(data)
                    }
                } else
                    resolve(data)
            }, function(tx, error) {
                app.dialog.alert(`Detalles: ${error.message}`, "SQLiteMethod: obtRegistrosPendientes")
                reject(data)
            })
        })
    })
}

async function obtAvances() {
    return new Promise((resolve, reject) => {
        let data = []
        db.transaction(function(tx) {
            tx.executeSql(`SELECT id, SourceWarehouse, SourceBinNum, TargetWarehouse, TargetBinNum, PartNum, TransferQty, UserName, FechaGuardado, FolioEtiquetaDevoluciones FROM registrostraspasos WHERE Exported = 0;`, [], 
            function(tx, res) {
                if (res.rows.length > 0) {
                    for (let i = 0; i < res.rows.length; i++) {
                        data.push({
                            id: res.rows.item(i).id,
                            SourceWhse: res.rows.item(i).SourceWarehouse,
                            SourceBin: res.rows.item(i).SourceBinNum,
                            TargetWhse: res.rows.item(i).TargetWarehouse,
                            TargetBin: res.rows.item(i).TargetBinNum,
                            PartNum: res.rows.item(i).PartNum,
                            TransferQty: res.rows.item(i).TransferQty,
                            UserName: res.rows.item(i).UserName,
                            FechaGuardado: res.rows.item(i).FechaGuardado,
                            TicketID: res.rows.item(i).FolioEtiquetaDevoluciones
                        })
                        resolve(data)
                    }
                } else
                    resolve(data)
            }, function(tx, error) {
                app.dialog.alert(`Detalles: ${error.message}`, "SQLiteMethod: obtAvances")
                reject(data)
            })
        })
    })
}

async function validarUsuario(user) {
    return new Promise((resolve, reject) => {
        let data = []
        db.transaction(function(tx) {
            tx.executeSql(`SELECT Password FROM usuarios WHERE Username = ?;`, [user], 
            function(tx, res) {
                if (res.rows.length > 0) {
                    data.push({
                        Password: res.rows.item(0).Password
                    })
                    resolve(data)
                } else
                    resolve(data)
            }, function(tx, error) {
                app.dialog.alert(`Detalles: ${error.message}`, "SQLiteMethod: validarUsuario")
                reject(data)
            })
        })
    })
}