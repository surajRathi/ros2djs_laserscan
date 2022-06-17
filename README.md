## Notes

The `nav2djs` is ancient, will be switching to the latest `ros2djs` and drop `nav2djs`.

Deps:
`rosbridge_server`, `tf2_web_republisher`

### Deprecated

The cdn for `ros2djs` and `nav2djs` don't work. We will need to build them ourselves.

```bash
git clone 'git@github.com:RobotWebTools/ros2djs.git'
git clone 'git@github.com:GT-RAIL/nav2djs.git'
```

See `ros2djs/CONTRIBUTING.md` and  `nav2djs/utils/README.md` for the build instructions.

To build documentation:

```bash
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
```