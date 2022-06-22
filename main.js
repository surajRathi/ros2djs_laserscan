// Connect to ROS
const ros = new ROSLIB.Ros({
    url: 'ws://192.168.0.12:9090'
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

        class ClickCatcher extends THREE.Object3D { //THREE.EventDispatcher {
            constructor() {
                super();
                this.active = true

                console.log("Made click Catcher")
                const dummy = this.dummy.bind(this)
                this.addEventListener('mousedown', dummy);
                this.addEventListener('mouseup', dummy);
                this.addEventListener('mousemove', dummy);
                this.addEventListener('touchstart', dummy);
                this.addEventListener('touchmove', dummy);
                this.addEventListener('touchend', dummy);
                // Chrome/Firefox have different events here
                this.addEventListener('mousewheel', dummy);
                this.addEventListener('DOMMouseScroll', dummy);
            }

            dummy(ev) {
                if (ev.type === 'mouseup') {
                    console.log("dummy callsed!!")
                    console.log(ev);
                }

            }

            raycast(raycaster, intersects) {
                const that = this;
                if (this.active) intersects.push({
                    distance: 0.0, distanceToRay: 0.0, point: null, index: null, face: null, object: that
                })
            }


        }

        this.cc = new ClickCatcher()
        this.viewer.addObject(this.cc, true)
        // How to get click position
        // 1. Make a class ```class OrbitControls extends THREE$1.EventDispatcher {```
        // 2. When in click mode, add a selectable object ( ```  addObject(object, selectable) ``` )
        // 3. Give the selectable object an even listener
        // 4. See what we actually get from there
        /*
            // add event listeners
            this.addEventListener('mousedown', onMouseDown);
            this.addEventListener('mouseup', onMouseUp);
            this.addEventListener('mousemove', onMouseMove);
            this.addEventListener('touchstart', onTouchDown);
            this.addEventListener('touchmove', onTouchMove);
            this.addEventListener('touchend', onTouchEnd);
            // Chrome/Firefox have different events here
            this.addEventListener('mousewheel', onMouseWheel);
            this.addEventListener('DOMMouseScroll', onMouseWheel);
        */

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
            material: {color: 0x00F800, size: 0.25}  // PointsMaterial
        })

        this.pose_client = new ROS3D.PoseWithCovariance({
            ros: ros, rootObject: this.viewer.scene, topic: '/amcl_pose', tfClient: this.tf_client, color: 0xF80000  // PointsMaterial
        })

    }
}

const app = new App();

document.addEventListener('DOMContentLoaded', app.init.bind(app), false);
