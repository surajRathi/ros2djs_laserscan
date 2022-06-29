// Connect to ROS
const ros = new ROSLIB.Ros({
    url: 'ws://192.168.0.12:9090'
    // url: 'ws://localhost:9090'
});

ros.on('connection', () => console.log('Connected to websocket server.'));
ros.on('error', error => console.log('Error connecting to websocket server: ', error));
ros.on('close', () => console.log('Connection to websocket server closed.'));


/**
 * An OccupancyGrid can convert a ROS occupancy grid message into a createjs Bitmap object.
 *
 * @constructor
 * @param options - object with following keys:
 *   * message - the occupancy grid message
 */
ROS2D.OccupancyGrid = function (options) {
    options = options || {};
    const message = options.message;

    // internal drawing canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // save the metadata we need
    this.pose = new ROSLIB.Pose({
        position: message.info.origin.position, orientation: message.info.origin.orientation
    });

    // set the size
    this.width = message.info.width;
    this.height = message.info.height;
    canvas.width = this.width;
    canvas.height = this.height;

    const imageData = context.createImageData(this.width, this.height);
    for (let row = 0; row < this.height; row++) {
        for (let col = 0; col < this.width; col++) {
            // determine the index into the map data
            const mapI = col + ((this.height - row - 1) * this.width);
            // determine the value
            const data = message.data[mapI];
            let val;
            if (data === 100) {
                val = 0;
            } else if (data === 0) {
                val = 255;
            } else {
                val = 127;
            }

            // determine the index into the image data array
            let i = (col + (row * this.width)) * 4;
            // r
            imageData.data[i] = val;
            // g
            imageData.data[++i] = val;
            // b
            imageData.data[++i] = val;
            // a
            imageData.data[++i] = data === -1 ? 0 : 255;
        }
    }
    context.putImageData(imageData, 0, 0);

    // create the bitmap
    createjs.Bitmap.call(this, canvas);
    // change Y direction
    this.y = -this.height * message.info.resolution;

    // scale the image
    this.scaleX = message.info.resolution;
    this.scaleY = message.info.resolution;
    this.width *= this.scaleX;
    this.height *= this.scaleY;

    // set the pose
    this.x += this.pose.position.x;
    this.y -= this.pose.position.y;
};
ROS2D.OccupancyGrid.prototype.__proto__ = createjs.Bitmap.prototype;

/**
 * A map that listens to a given occupancy grid topic.
 *
 * Emits the following events:
 *   * 'change' - there was an update or change in the map
 *
 * @constructor
 * @param options - object with following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic (optional) - the map topic to listen to
 *   * rootObject (optional) - the root object to add this marker to
 *   * continuous (optional) - if the map should be continuously loaded (e.g., for SLAM)
 */
ROS2D.OccupancyGridClient = function (options) {
    const that = this;
    options = options || {};
    const ros = options.ros;
    const topic = options.topic || '/map';
    this.continuous = options.continuous;
    this.rootObject = options.rootObject || new createjs.Container();

    // current grid that is displayed
    // create an empty shape to start with, so that the order remains correct.
    this.currentGrid = new createjs.Shape();
    this.rootObject.addChild(this.currentGrid);
    // work-around for a bug in easeljs -- needs a second object to render correctly
    this.rootObject.addChild(new ROS2D.Grid({size: 1}));

    // subscribe to the topic
    const rosTopic = new ROSLIB.Topic({
        ros: ros, name: topic, messageType: 'nav_msgs/OccupancyGrid', compression: 'png'
    });

    rosTopic.subscribe(function (message) {
        // check for an old map
        let index = null;
        if (that.currentGrid) {
            index = that.rootObject.getChildIndex(that.currentGrid);
            that.rootObject.removeChild(that.currentGrid);
        }

        that.currentGrid = new ROS2D.OccupancyGrid({
            message: message
        });
        if (index !== null) {
            that.rootObject.addChildAt(that.currentGrid, index);
        } else {
            that.rootObject.addChild(that.currentGrid);
        }

        that.emit('change');

        // check if we should unsubscribe
        if (!that.continuous) {
            rosTopic.unsubscribe();
        }
    });
};
ROS2D.OccupancyGridClient.prototype.__proto__ = EventEmitter2.prototype;

const MY2D = {}
// var MY2D = MY2D || {}

/**
 * An OccupancyGrid can convert a ROS occupancy grid message into a createjs Bitmap object.
 *
 * @constructor
 * @param options - object with following keys:
 *   * message - the occupancy grid message
 *   * color - object with following keys:
 *     * r - scaling factor for the red component
 *     * g - scaling factor for the green component
 *     * b - scaling factor for the blue component
 *     * a - scaling factor for the alpha component
 */
MY2D.OccupancyGridU = function (options) {
    options = options || {};
    const message = options.message;
    const r = options.color.r || 0.0
    const g = options.color.g || 0.0
    const b = options.color.b || 0.0
    const a = options.color.a || 1.0
    // internal drawing canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    // document.body.appendChild(canvas)

    // save the metadata we need
    this.pose = new ROSLIB.Pose({
        position: message.info.origin.position, orientation: message.info.origin.orientation
    });

    // set the size
    this.width = message.info.width;
    this.height = message.info.height;
    canvas.width = this.width;
    canvas.height = this.height;

    function set_color(data, imageData, i) {
        let val;
        if (data > 250 * 100 / 255) {
            val = 255;
        } else if (data > 128 * 100 / 255) {
            val = 127;
        } else {
            val = 0;
        }


        // r
        imageData.data[i] = val * r;
        // g
        imageData.data[++i] = val * g;
        // b
        imageData.data[++i] = val * b;
        // a
        imageData.data[++i] = (val === 0 ? 0 : 255) * a;
    }


    const imageData = context.createImageData(this.width, this.height);
    for (let row = 0; row < this.height; row++) {
        for (let col = 0; col < this.width; col++) {
            // determine the index into the map data
            const mapI = col + ((this.height - row - 1) * this.width);
            // determine the value
            const data = message.data[mapI];
            // determine the index into the image data array
            let i = (col + (row * this.width)) * 4;

            set_color(data, imageData, i);
        }
    }
    context.putImageData(imageData, 0, 0);

    // create the bitmap
    createjs.Bitmap.call(this, canvas);
    // change Y direction
    this.y = -this.height * message.info.resolution;

    // scale the image
    this.scaleX = message.info.resolution;
    this.scaleY = message.info.resolution;
    this.width *= this.scaleX;
    this.height *= this.scaleY;

    // set the pose
    this.x += this.pose.position.x;
    this.y -= this.pose.position.y;

    const that = this;
    this.update = function (msg) {
        // console.log(msg.header.seq)  // TODO: Check for dropped sequence
        const x = msg.x, y = msg.y, width = msg.width, height = msg.height;
        const mdata = msg.data;

        const imageData = context.createImageData(width, height);
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                // determine the index into the map data
                const mapI = col + ((height - row - 1) * width);
                // determine the value
                const data = mdata[mapI];
                // determine the index into the image data array
                let i = (col + (row * width)) * 4;

                set_color(data, imageData, i);
            }
        }
        context.putImageData(imageData, x, y);
    }
};
MY2D.OccupancyGridU.prototype.__proto__ = createjs.Bitmap.prototype;

/**
 * A map that listens to a given occupancy grid topic.
 *
 * Emits the following events:
 *   * 'change' - there was an update or change in the map
 *
 * @constructor
 * @param options - object with following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic (optional) - the map topic to listen to
 *   * update_topic (optional) - the map_updates topic to listen to
 *   * rootObject (optional) - the root object to add this marker to
 *   * continuous (optional) - if the map should be continuously loaded (e.g., for SLAM)
 */
MY2D.OccupancyGridClientU = function (options) {
    const that = this;
    options = options || {};
    const ros = options.ros;
    const topic = options.topic || '/costmap';
    const update_topic = options.update_topic || topic + '_updates';
    const color = options.color || {}
    this.rootObject = options.rootObject || new createjs.Container();

    // current grid that is displayed
    // create an empty shape to start with, so that the order remains correct.
    this.currentGrid = new createjs.Shape();
    this.rootObject.addChild(this.currentGrid);
    // work-around for a bug in easeljs -- needs a second object to render correctly
    this.rootObject.addChild(new ROS2D.Grid({size: 1}));

    // subscribe to the topic
    const rosTopic = new ROSLIB.Topic({
        ros: ros, name: topic, messageType: 'nav_msgs/OccupancyGrid', compression: 'png'
    });

    const updateTopic = new ROSLIB.Topic({
        ros: ros, name: update_topic, messageType: 'map_msgs/OccupancyGridUpdate'  // , compression: 'png'
    });
    rosTopic.subscribe(function (message) {
        // check for an old map
        var index = null;
        if (that.currentGrid) {
            updateTopic.unsubscribe()
            index = that.rootObject.getChildIndex(that.currentGrid);
            that.rootObject.removeChild(that.currentGrid);
        }

        that.currentGrid = new MY2D.OccupancyGridU({
            message: message, color: color
        });
        if (index !== null) {
            that.rootObject.addChildAt(that.currentGrid, index);
        } else {
            that.rootObject.addChild(that.currentGrid);
        }

        that.emit('change');

        updateTopic.subscribe(function (msg) {
            that.currentGrid.update(msg)
        })
    })
}
MY2D.OccupancyGridClientU.prototype.__proto__ = EventEmitter2.prototype;


class App {
    ground_frame = "map"
    width = 720
    height = 655
    scale_factor = 1.0

    base_footprint_tf = null

    div_el_id = 'nav'


    constructor(ros) {
        this.ros = ros
    }

    init() {
        // Initialize TF
        this.tf_client = new ROSLIB.TFClient({
            ros: this.ros, fixedFrame: this.ground_frame, angularThres: 0.01, transThres: 0.01
        })
        this.tf_client.subscribe('/base_footprint', transform => this.base_footprint_tf = transform)


        // Create the frontend
        this.div_el = document.getElementById(this.div_el_id)
        this.viewer = new ROS2D.Viewer({
            divID: this.div_el_id, width: this.width, height: this.height
        });
        this.viewer.scene.stage.canvas.getContext("2d").imageSmoothingEnabled = false

        this.zoom_view = new ROS2D.ZoomView({
            rootObject: this.viewer.scene
        })
        this.zoom_view.startZoom(this.width / 2, this.height / 2)

        // Setup zoom and pan hooks
        // TODO: Check out PanView
        this.div_el.addEventListener("wheel", (ev) => {
            this.scale_factor -= ev.deltaY / 1000
            this.scale_factor = this.scale_factor <= 0 ? this.zoom_view.minScale : this.scale_factor
            this.zoom_view.zoom(this.scale_factor)
        });
        this.div_el.addEventListener('mousemove', (e) => {
            if (e.buttons === 1) {
                // The y-axis is flipped in ROS
                this.viewer.shift(-e.movementX / this.viewer.scene.scaleX, e.movementY / this.viewer.scene.scaleY)
                this.zoom_view.startZoom(this.width / 2, this.height / 2)
            }
        })

        // Set initial pan
        setTimeout(() => {
            this.viewer.shift(-this.width / 2 / this.viewer.scene.scaleX, -this.height / 2 / this.viewer.scene.scaleY)
            this.zoom_view.startZoom(this.width / 2, this.height / 2)
        }, 300)


        // Set up the map client.
        this.map_client = new ROS2D.OccupancyGridClient({
            ros: this.ros, rootObject: this.viewer.scene, continuous: false
        });


        this.global_costmap_client = new MY2D.OccupancyGridClientU({
            ros: this.ros,
            rootObject: this.viewer.scene,
            continuous: true,
            topic: '/move_base/global_costmap/costmap',
            color: {b: 1.0, a: 0.2}
        });

        this.costmap_client = new MY2D.OccupancyGridClientU({
            ros: this.ros,
            rootObject: this.viewer.scene,
            continuous: true,
            topic: '/move_base/local_costmap/costmap',
            color: {r: 1.0, a: 0.5}
        });


        // Scale the canvas to fit to the map
        this.map_client.on('change', () => this.viewer.scaleToDimensions(this.map_client.currentGrid.width, this.map_client.currentGrid.height));
    }
}


class LaserScanRenderer {
    prev_markers = null

    constructor(options) {
        options = options || {}
        this.app = options.app
        this.topic = options.topic || "/scan"
        this.marker_radius = options.marker_radius || 0.025
        this.marker_fill_color = options.marker_fill_color || createjs.Graphics.getRGB(0, 255, 0, 1.0)

        this.listener = new ROSLIB.Topic({
            ros: this.app.ros, name: this.topic, messageType: 'sensor_msgs/LaserScan'
        });

        this.prev_markers = null

        this.listener.subscribe(this.callback.bind(this));

    }

    callback(msg) {

        // TODO: Take tf origin frame from the header and dont assume that it is always `base_footprint`

        // Find points in the laser scan frame
        const num = msg.ranges.length
        const angles = Array.from({length: num}, (_, i) => msg.angle_min + (msg.angle_max - msg.angle_min) / num * i)
        const poses_2d = angles.flatMap((angle, index) => {
            const range = msg.ranges[index];
            if (range > msg.range_min && range < msg.range_max) {
                return [[Math.cos(angle) * range, Math.sin(angle) * range, -angle]]
            }
            return []  // Skip this point
        });


        if (this.app.base_footprint_tf === null) {
            console.log('no tf');
            return;
        }

        // TODO: We might be able to apply the tf transform to the container itself, and dont have to do it on each pose.
        // Init the graphics component
        const scan_markers = new createjs.Container();

        const graphics = new createjs.Graphics()
            .beginFill(this.marker_fill_color)
            .drawCircle(0, 0, this.marker_radius)
            .endFill();

        // Transform each point and add it to the graphics
        poses_2d.forEach(pt => {
            // pt[2] += Math.PI / 2
            const pose = new ROSLIB.Pose({
                position: new ROSLIB.Vector3({
                    x: pt[0], y: pt[1], z: 0
                }), orientation: new ROSLIB.Quaternion({
                    x: 0, y: 0, z: Math.cos(pt[2]), w: Math.sin(pt[2])

                })
            })
            pose.applyTransform(this.app.base_footprint_tf)

            const marker = new createjs.Shape(graphics)
            marker.x = pose.position.x;
            marker.y = -pose.position.y;
            marker.rotation = this.app.viewer.scene.rosQuaternionToGlobalTheta(pose.orientation);

            scan_markers.addChild(marker)
        })

        // TODO: Just update the old one, dont make new ones everytime
        if (this.prev_markers !== null) this.app.viewer.scene.removeChild(this.prev_markers)

        this.app.viewer.addObject(scan_markers)
        this.prev_markers = scan_markers
    }

}

class PathRenderer {
    prev_markers = null
    timeout = null

    constructor(options) {
        options = options || {}
        this.app = options.app
        this.topic = options.topic || "/move_base/NavfnROS/plan"
        this.alive_timeout = options.alive_timeout || 0.5 * 1000  // Set this to the interval for path publishing (ms)
        this.marker_radius = options.marker_radius || 0.02
        this.marker_min_dist = options.marker_min_dist || 0.1
        this.marker_fill_color = options.marker_fill_color || createjs.Graphics.getRGB(0, 0, 255, 1.0)

        this.listener = new ROSLIB.Topic({
            ros: this.app.ros, name: this.topic, messageType: 'nav_msgs/Path'
        });

        this.prev_markers = null

        this.listener.subscribe(this.callback.bind(this));

    }

    callback(msg) {
        if (this.timeout !== null) {
            clearTimeout(this.timeout)
            this.timeout = null
        }
        // console.log(msg)
        // Init the graphics component
        const path_markers = new createjs.Container();

        const graphics = new createjs.Graphics();
        graphics.beginFill(this.marker_fill_color);
        graphics.drawCircle(0, 0, this.marker_radius)
        graphics.endFill();

        let prev_pose = null;
        // Transform each point and add it to the graphics
        msg.poses.forEach(pose => {
            if (prev_pose !== null) {
                // TODO: 'bucket' the path or only sample on a fixed set of x values to stop it from looking like a shifting mess
                const distsq = Math.pow(pose.pose.position.x - prev_pose.pose.position.x, 2) + Math.pow(pose.pose.position.y - prev_pose.pose.position.y, 2) + Math.pow(pose.pose.position.z - prev_pose.pose.position.z, 2)
                if (distsq < this.marker_min_dist * this.marker_min_dist) {
                    return
                }
            }

            prev_pose = pose
            const marker = new createjs.Shape(graphics)
            marker.x = pose.pose.position.x;
            marker.y = -pose.pose.position.y;
            marker.rotation = this.app.viewer.scene.rosQuaternionToGlobalTheta(pose.pose.orientation);

            path_markers.addChild(marker)

        })

        // TODO: Just update the old one, dont make new ones everytime
        if (this.prev_markers !== null) this.app.viewer.scene.removeChild(this.prev_markers)

        this.app.viewer.addObject(path_markers)
        this.prev_markers = path_markers
        this.alive = false
        this.timeout = setTimeout(() => {
            if (this.prev_markers !== null) this.app.viewer.scene.removeChild(this.prev_markers)
        }, this.alive_timeout)
    }

}

class GoalPoseRenderer {
    prev_marker = null

    constructor(options) {
        options = options || {}
        this.app = options.app
        this.topic = options.topic || "/move_base/goal"
        this.marker_size = options.marker_size || 0.1
        this.marker_fill_color = options.marker_fill_color || createjs.Graphics.getRGB(255, 165, 0, 1.0)

        this.listener = new ROSLIB.Topic({
            ros: this.app.ros, name: this.topic, messageType: 'move_base_msgs/MoveBaseActionGoal'
        });

        this.prev_marker = null

        this.listener.subscribe(this.callback.bind(this));

    }

    callback(msg) {
        const pose = msg.goal.target_pose

        const marker = new createjs.Shape()
        marker.graphics.beginFill(this.marker_fill_color).drawPolyStar(0, 0, this.marker_size, 3, 0, Math.PI)
        marker.x = pose.pose.position.x;
        marker.y = -pose.pose.position.y;
        marker.rotation = this.app.viewer.scene.rosQuaternionToGlobalTheta(pose.pose.orientation);
        // marker.scaleX = 1.0 / this.app.viewer.scene.scaleX;
        // marker.scaleY = 1.0 / this.app.viewer.scene.scaleY;


        // TODO: Just update the old one, dont make new ones everytime
        if (this.prev_marker !== null) this.app.viewer.scene.removeChild(this.prev_marker)
        this.app.viewer.addObject(marker)
        this.prev_marker = marker
    }

}


class PoseRenderer {
    prev_marker = null

    constructor(options) {
        options = options || {}
        this.app = options.app
        this.topic = options.topic || "/amcl_pose"
        this.marker_size = options.marker_size || 0.1
        this.marker_fill_color = options.marker_fill_color || createjs.Graphics.getRGB(255, 20, 20, 1.0)

        this.listener = new ROSLIB.Topic({
            ros: this.app.ros, name: this.topic, messageType: 'geometry_msgs/PoseWithCovarianceStamped'
        });

        this.prev_marker = null

        this.listener.subscribe(this.callback.bind(this));

    }

    callback(msg) {
        const pose = msg.pose

        const marker = new createjs.Shape()
        marker.graphics.beginFill(this.marker_fill_color).drawPolyStar(0, 0, this.marker_size, 3, 0, Math.PI)
        marker.x = pose.pose.position.x;
        marker.y = -pose.pose.position.y;
        marker.rotation = this.app.viewer.scene.rosQuaternionToGlobalTheta(pose.pose.orientation);


        // TODO: Just update the old one, dont make new ones everytime
        if (this.prev_marker !== null) this.app.viewer.scene.removeChild(this.prev_marker)
        this.app.viewer.addObject(marker)
        this.prev_marker = marker
    }

}

const app = new App(ros);

const laser_scan = new LaserScanRenderer({app: app, topic: "/scan"})
const global_path = new PathRenderer({app: app})
const goal_pose = new GoalPoseRenderer({app: app})
const pose = new PoseRenderer({app: app})


document.addEventListener('DOMContentLoaded', app.init.bind(app), false);
