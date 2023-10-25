import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
// import icon from '../../assets/icon.svg';
import './App.css';
import { Component } from 'react';
// import {Dev} from '@node-escpos/core';
import toastr from 'toastr';
import moment from 'moment';

toastr.options = {
  closeButton: false,
  debug: false,
  newestOnTop: false,
  progressBar: false,
  positionClass: 'toast-bottom-full-width',
  preventDuplicates: false,
  showDuration: 300,
  hideDuration: 1000,
  timeOut: 5000,
  extendedTimeOut: 1000,
  showEasing: 'swing',
  hideEasing: 'linear',
  showMethod: 'fadeIn',
  hideMethod: 'fadeOut',
};
// function Hello() {
//   function componentDidMount() {
//   }
//   function testPrint() {
//     window.electron.ipcRenderer.sendMessage('ipc-example', 'hello');
//   }
//   return (
//     <div>
//       <div className="h-screen flex items-center justify-center bg-gray-200">
//         <button
//           type="button"
//           onClick={testPrint}
//           className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
//         >
//           Default
//         </button>
//       </div>
//     </div>
//   );
// }
interface IProps {}
interface IState {
  usbDeviceList?: Device[];
  selectedDevice?: Device;
}

class Hello extends Component<IProps, IState> {
  constructor(props: any) {
    super(props);
    this.state = {
      usbDeviceList: [],
      selectedDevice: undefined,
    };
  }

  componentDidMount() {
    const that = this;
    window.electron.ipcRenderer.on('usb-list', (arg: Device[]) => {
      // eslint-disable-next-line no-console
      console.log('DAPET', arg);
      // if (that.state?.usbDeviceList?.length === 0) {
      // }
      that.setState({ usbDeviceList: arg });
    });
    window.electron.ipcRenderer.on('get-selected-usb-device', (arg: Device) => {
      console.log('RIBET', arg);
      if (arg !== undefined) {
        that.setState({ selectedDevice: arg });
      }
    });
    window.electron.ipcRenderer.on('command', (arg) => {
      // console.log(arg);
      switch (arg) {
        case 'clear-saved-device':
          window.electron.ipcRenderer.sendMessage(
            'set-selected-usb-device',
            undefined,
          );
          this.setState({ selectedDevice: undefined });
          break;

        default:
          break;
      }
    });
    window.electron.ipcRenderer.sendMessage('usb-list', 'hello');
    window.electron.ipcRenderer.sendMessage('get-selected-usb-device');
  }

  refreshUsbList() {
    window.electron.ipcRenderer.sendMessage('usb-list', 'hello');
  }

  setSelectedDevice = (selectedDevice: Device) => {
    window.electron.ipcRenderer.sendMessage(
      'set-selected-usb-device',
      /* undefined */ selectedDevice,
    );
    this.setState({ selectedDevice });
  };

  testPrint() {
    const { selectedDevice } = this.state;
    window.electron.ipcRenderer.once('usb-do-print', (arg: string) => {
      console.log(arg);
      toastr.error(arg);
    });
    window.electron.ipcRenderer.sendMessage('usb-do-print', [
      {
        CMD: 'FONT',
        ARGS: 'b',
      },
      {
        CMD: 'TEXT',
        ARGS: `TEST PRINT AT ${moment()
          .format('YYYY-MM-DD HH:mm:ss')
          .toString()}`,
      },
    ]);
    // const that = this;

    // if (selectedDevice !== undefined) {

    // }
    // this.setState({ selectedDevice: undefined });
  }

  render() {
    const { usbDeviceList, selectedDevice } = this.state;
    return (
      <div>
        <div className="h-screen flex flex-col items-center justify-center bg-gray-200">
          {(usbDeviceList?.length || 0) > 0 && <h5>Select Device:</h5>}
          {usbDeviceList?.length === 0 && (
            <span>No USB Printer Device Detected.</span>
          )}
          {usbDeviceList?.map((device) => (
            <button
              type="button"
              className={`block max-w-sm p-6 bg-white rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 ${
                device?.deviceDescriptor?.idProduct ===
                selectedDevice?.deviceDescriptor?.idProduct
                  ? 'border-2 border-green-400'
                  : ''
              }`}
              onClick={() => this.setSelectedDevice(device)}
              key={device.deviceDescriptor.idVendor}
            >
              <h5
                className={`text-2xl font-bold tracking-tight dark:text-white ${
                  device?.deviceDescriptor?.idProduct ===
                  selectedDevice?.deviceDescriptor?.idProduct
                    ? 'text-green-500'
                    : 'text-gray-500'
                }`}
              >
                <p>Device Id: {device?.deviceDescriptor?.idProduct}</p>
                <p>Vendor Id: {device?.deviceDescriptor?.idVendor}</p>
              </h5>
            </button>
          ))}
          <div className="flex">
            <button
              onClick={() => this.refreshUsbList()}
              type="button"
              className="text-white bg-gradient-to-r from-green-400 via-green-500 to-green-600 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 mt-2"
            >
              Refresh Device List
            </button>
            {(usbDeviceList?.length || 0) > 0 && (
              <button
                type="button"
                onClick={() => this.testPrint()}
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 mt-2"
              >
                Test Print Selected Device
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
