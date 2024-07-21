import ZookeeperDataSource from "./ZookeeperDataSource";
import messages from './i18n';

export default (appCore) => {
    return {
        register() {
            for(let key in messages) {
                appCore.registryPluginLocal(key, messages[key]);
            }

            appCore.registerDataSource('zookeeper', new ZookeeperDataSource(appCore));
            return {}
        }
    };

}