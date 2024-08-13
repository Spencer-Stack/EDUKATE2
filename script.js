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

            if (ports.length !== 0) {
                for (let port of ports) {
                    if (port.manufacturer === "Arduino (www.arduino.cc)") {
                        // Skip if the port is already open
                        if (serial_port && serial_port.isOpen) {
                            return;
                        }

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
                    }
                }
            }
        });
    }

    function writeTo() {
        if (serial_port && serial_port.isOpen) {
            // Use the exportAsChars method from LogicController
            let message = logicController.exportAsChars();
            // message = '<01|B1|>';
            console.log(message);
            serial_port.write(message, (err) => {});
        }
    }

    // Function to list ports and start communication
    function listPorts() {
        listSerialPorts();
        setTimeout(listPorts, 2000);
    }

    // Start port listing
    listPorts();

    $('#upload').on('click', function () {
        let parse_result = visualController.parseCode(false);
        if (parse_result["res"]){
            writeTo();
        } else{
            visualController.showInfoAlert(parse_result['text']);
        }
    });
});