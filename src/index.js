import ZookeeperDataSource from "./ZookeeperDataSource";

export default (appCore) => {
    return {
        register() {
            appCore.registerDataSource('zookeeper', new ZookeeperDataSource(appCore));
            return {}
        }
    };

}