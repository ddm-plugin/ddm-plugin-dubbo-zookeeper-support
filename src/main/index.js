import ZookeeperDataSource from "./datasource/ZookeeperDataSource";
import NacosDataSource from "./datasource/NacosDataSource";
import DubboAdminDataSource from "./datasource/DubboAdminDataSource";
import messages from '../i18n';

export default (appCore) => {
    Map.prototype.computeIfAbsent = async function (key, fun) {
        if(!this.has(key)){
            this.set(key, await fun(key));
        }
        return this.get(key);
    }

    return {
        register() {
            for(let key in messages) {
                appCore.registryPluginLocal(key, messages[key]);
            }

            appCore.registerDataSource('dubbo-admin', new DubboAdminDataSource(appCore));
            appCore.registerDataSource('nacos', new NacosDataSource(appCore));
            appCore.registerDataSource('zookeeper', new ZookeeperDataSource(appCore));
            return {}
        }
    };

}