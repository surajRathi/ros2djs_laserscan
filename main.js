// Connect to ROS
const ros = new ROSLIB.Ros({
    url: 'ws://localhost:9090'
});

ros.on('connection', () => console.log('Connected to websocket server.'));
ros.on('error', error => console.log('Error connecting to websocket server: ', error));
ros.on('close', () => console.log('Connection to websocket server closed.'));


class App {
    ground_frame = "map"
    width = 720
    height = 655

    tf_client

    div_el_id = 'nav'
    div_el

    viewer
    map_client
    laser_client

    init() {
        // Initialize TF
        this.tf_client = new ROSLIB.TFClient({
            ros: ros, fixedFrame: this.ground_frame, angularThres: 0.01, transThres: 0.01
        })
        // this.tf_client.subscribe('/base_footprint', transform => this.base_footprint_tf = transform)


        // Create the frontend
        this.div_el = document.getElementById(this.div_el_id)
        this.viewer = new ROS3D.Viewer({
            divID: this.div_el_id, width: this.width, height: this.height, antialias: true
        });

        // Set up the map client.
        this.map_client = new ROS3D.OccupancyGridClient({
            ros: ros, rootObject: this.viewer.scene, topic: '/map', continuous: true, tf_client: this.tf_client,
        });

        // See also:
        //  pointRatio (optional) - point subsampling ratio (default: 1, no subsampling)
        //  messageRatio (optional) - message subsampling ratio (default: 1, no subsampling)

        this.laser_client = new ROS3D.LaserScan({
            ros: ros,
            rootObject: this.viewer.scene,
            topic: '/scan',
            tfClient: this.tf_client,
            max_pts: 10000,
            material: {color: 0xF80000, size: 0.3}  // PointsMaterial
        })
    }
}

const app = new App();

document.addEventListener('DOMContentLoaded', app.init.bind(app), false);
