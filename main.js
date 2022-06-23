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

        this.action_client = new ROSLIB.ActionClient({
            ros: this.ros, serverName: '/move_base', actionName: 'move_base/goal'
        });

        // You have to tao thrice quickly to activate the trigger the catcher idk why
        class ClickCatcher extends THREE.EventDispatcher {
            constructor(mouseHandler, scene, ros, ac_client) {
                super();
                this.action_client = ac_client
                this.ros = ros
                this.mouse_handler = mouseHandler
                this.scene = scene
                this.marker = null

                this.start = null

                console.log("Made click Catcher")
                const dummy = this.dummy.bind(this)
                const start_dummy = this.start_dummy.bind(this)
                this.addEventListener('mousedown', start_dummy);
                this.addEventListener('mouseup', dummy);
                this.addEventListener('touchstart', start_dummy);
                this.addEventListener('touchend', dummy);

                // TODO: Show the arrow when they are dragging
                // this.addEventListener('mousemove', dummy);
                // this.addEventListener('touchmove', dummy);
            }

            start_dummy(ev) {
                if (ev.type === 'mousedown' || ev.type === 'touchstart') {
                    this.start = ROS3D.intersectPlane(ev.mouseRay, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1))
                    console.log(this.start)
                }
            }

            dummy(ev) {
                if (ev.type === 'mouseup' || ev.type === 'touchend') {
                    console.log("dummy callsed!!")
                    // console.log(ev);

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

                    const currentTime = new Date();
                    const secs = Math.floor(currentTime.getTime() / 1000);
                    const nsecs = Math.round(1000000000 * (currentTime.getTime() / 1000 - secs));
                    const goal = new ROSLIB.Goal({
                        actionClient: this.action_client, goalMessage: {
                            target_pose: {
                                header: {
                                    frame_id: 'map', stamp: {
                                        secs: secs, nsecs: nsecs
                                    }
                                },

                                pose: {
                                    position: {
                                        x: this.start.x, y: this.start.y, z: this.start.z
                                    }, orientation: {
                                        x: 0, y: 0, z: Math.sin(theta / 2), w: Math.cos(theta / 2)
                                    }
                                }

                            }
                        }
                    });

                    goal.on('feedback', function (feedback) {
                        console.log('Feedback: ' + feedback.sequence);
                    });

                    goal.on('result', function (result) {
                        console.log('Final Result: ' + result.sequence);
                    });

                    goal.send();
                }

            }
        }

        this.cc = new ClickCatcher(this.viewer.highlighter.mouseHandler, this.viewer.scene, this.ros, this.action_client)
        this.viewer.highlighter.mouseHandler.camera_controls = this.viewer.highlighter.mouseHandler.fallbackTarget
        this.viewer.highlighter.mouseHandler.click_catcher = this.cc

        document.getElementById(this.goal_button_el_id).onclick = (ev) => {
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
