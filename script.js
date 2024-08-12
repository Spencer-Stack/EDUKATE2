const { SerialPort } = require('serialport');

$(document).ready(function () {
    const visualController = new VisualController();
    const logicController = new LogicController(visualController);
    const accountController = new AccountController('account', 'programs', visualController);    
    visualController.logic_controller = logicController;
    visualController.account_controller = accountController;
    visualController.setOptions();

    let serial_port = null;
    let writeInterval = null;

    async function listSerialPorts() {
        await SerialPort.list().then((ports, err) => {
            if (err) {
                console.log(err.message);
            }

            console.log(ports);

            if (ports.length !== 0) {
                for (let port of ports) {
                    if (port.manufacturer === "Arduino (www.arduino.cc)") {
                        // Skip if the port is already open
                        if (serial_port && serial_port.isOpen) {
                            return;
                        }

                        clearInterval(writeInterval);
                        if (serial_port) {
                            serial_port.close();
                        }

                        serial_port = new SerialPort({
                            path: port.path,
                            baudRate: 9600,
                        });

                        serial_port.on('error', function (err) {
                            console.log('Error: ', err.message);
                        });

                        serial_port.on('open', function () {
                            console.log('Serial Port Opened');
                            startWriting();
                        });
                    }
                }
            }
        });
    }

    function startWriting() {
        if (writeInterval) {
            clearInterval(writeInterval);
        }

        writeInterval = setInterval(() => {
            if (serial_port && serial_port.isOpen) {
                // const message = (Math.floor(Math.random() * 30) + 1).toString();
                const message = "<121>";
                serial_port.write(message, (err) => {
                    if (err) {
                        return console.log('Error on write: ', err.message);
                    }
                    console.log(`I sent: ${message}`);
                });
            }
        }, 5000);

        // if (serial_port && serial_port.isOpen) {
        //     // const message = (Math.floor(Math.random() * 30) + 1).toString();
        //     const message = "11111111";
        //     serial_port.write(message, (err) => {});
        // }
    }

    function listPorts() {
        listSerialPorts();
        // setTimeout(listPorts, 500);
    }

    // Start port listing
    setTimeout(listPorts, 2000);
});