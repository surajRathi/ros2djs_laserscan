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

    goal_button_el_id = 'goal_pose_button'
    time_textbox_el_id = 'time_to_sleep'
    sleep_button_el_id = 'sleep_button'

    viewer
    map_client
    laser_client

    constructor(ros) {
        this.ros = ros
    }

    init() {
        // Initialize TF
        this.tf_client = new ROSLIB.TFClient({
            ros: this.ros, fixedFrame: this.ground_frame, angularThres: 0.01, transThres: 0.01
        })


        // Create the frontend
        this.div_el = document.getElementById(this.div_el_id)
        this.viewer = new ROS3D.Viewer({
            divID: this.div_el_id, width: this.width, height: this.height, antialias: true
        });


        this.executor_pub = new ROSLIB.Topic({
            ros: this.ros, name: "/cmd", messageType: "std_msgs/String",
        })
        this.executor_pub.advertise()

        document.getElementById(this.sleep_button_el_id).onclick = (ev) => {
            const sleep_obj = {
                "cmd": "sleep", "time": parseFloat(document.getElementById(this.time_textbox_el_id).value)
            }

            this.executor_pub.publish(new ROSLIB.Message({
                data: JSON.stringify(sleep_obj)
            }))
        }

        // You have to tao thrice quickly to activate the trigger the catcher idk why
        class ClickCatcher extends THREE.EventDispatcher {
            constructor(scene, mouseHandler, pub_topic) {
                super();
                this.pub_topic = pub_topic
                this.mouse_handler = mouseHandler
                this.scene = scene
                this.marker = null

                this.start = null

                const on_mouse_down_dummy = this.on_mouse_down.bind(this)
                const on_mouse_up_dummy = this.on_mouse_up.bind(this)
                this.addEventListener('mousedown', on_mouse_down_dummy);
                this.addEventListener('touchstart', on_mouse_down_dummy);

                this.addEventListener('mouseup', on_mouse_up_dummy);
                this.addEventListener('touchend', on_mouse_up_dummy);

                // TODO: Show the arrow when they are dragging
                // this.addEventListener('mousemove', dummy);
                // this.addEventListener('touchmove', dummy);

                this.mouse_handler.camera_controls = this.mouse_handler.fallbackTarget
                this.mouse_handler.click_catcher = this
            }

            on_mouse_down(ev) {
                if (ev.type === 'mousedown' || ev.type === 'touchstart') {
                    this.start = ROS3D.intersectPlane(ev.mouseRay, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1))
                }
            }

            on_mouse_up(ev) {
                if (ev.type === 'mouseup' || ev.type === 'touchend') {
                    const position = ROS3D.intersectPlane(ev.mouseRay, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1))
                    const theta = Math.atan2(position.y - this.start.y, position.x - this.start.x)

                    console.log(this.start, theta * 180 / Math.PI)

                    if (this.marker !== null) {
                        this.scene.remove(this.marker)
                    }
                    this.marker = new ROS3D.Arrow({
                        origin: this.start,
                        direction: new THREE.Vector3(Math.cos(theta), Math.sin(theta), 0),
                        material: ROS3D.makeColorMaterial(1.0, 1.0, 0.0, 1.0)
                    })
                    this.scene.add(this.marker)

                    // Disable it
                    this.mouse_handler.fallbackTarget = this.mouse_handler.camera_controls

                    const send_goal_obj = {
                        "cmd": "send_goal", "header": {"frame_id": "/map"}, "pose": {
                            "position": {"x": this.start.x, "y": this.start.y, "z": this.start.z},
                            "orientation": {"x": 0.0, "y": 0.0, "z": Math.sin(theta / 2)}
                        }
                    }

                    this.pub_topic.publish(new ROSLIB.Message({
                        data: JSON.stringify(send_goal_obj)
                    }))
                }

            }
        }

        this.cc = new ClickCatcher(this.viewer.scene, this.viewer.highlighter.mouseHandler, this.executor_pub)


        document.getElementById(this.goal_button_el_id).onclick = () => {
            this.viewer.highlighter.mouseHandler.fallbackTarget = this.viewer.highlighter.mouseHandler.click_catcher
        }

        // Set up the map client.
        this.map_client = new ROS3D.OccupancyGridClient({
            ros: this.ros, rootObject: this.viewer.scene, topic: '/map', continuous: true, tf_client: this.tf_client,
        });

        // See also:
        //  pointRatio (optional) - point subsampling ratio (default: 1, no subsampling)
        //  messageRatio (optional) - message subsampling ratio (default: 1, no subsampling)

        this.laser_client = new ROS3D.LaserScan({
            ros: this.ros,
            rootObject: this.viewer.scene,
            topic: '/scan',
            tfClient: this.tf_client,
            max_pts: 10000,
            material: {color: 0x00F800, size: 0.25}  // PointsMaterial
        })

        this.pose_client = new ROS3D.PoseWithCovariance({
            ros: this.ros, rootObject: this.viewer.scene, topic: '/amcl_pose', tfClient: this.tf_client, color: 0xF80000  // PointsMaterial
        })

    }
}

const app = new App(ros);

document.addEventListener('DOMContentLoaded', app.init.bind(app), false);
