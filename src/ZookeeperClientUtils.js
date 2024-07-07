import zookeeperClient from "node-zookeeper-client";

class ZookeeperClientUtils {
  createConncetion(registryConfig) {
    let { address } = registryConfig;
  
    const OPTIONS = {
      sessionTimeout: registryConfig.sessionTimeout,
    };
  
    let zkClient = new Promise((resolve, reject) => {
        let zk = zookeeperClient.createClient(address, OPTIONS);
        zk.on("connected", function () {
          if(registryConfig.scheme && registryConfig.auth){
            zk.addAuthInfo(registryConfig.scheme, Buffer.from(registryConfig.auth));  
          }
          resolve(zk);
        });
    
        setTimeout(() => {
          reject(new Error('connection timeout'));
        }, OPTIONS.sessionTimeout);
    
        zk.connect();
      });

    return zkClient;
  }

  async getChildren(registryConfig, path){
    const zk = await this.createConncetion(registryConfig);

    return new Promise((resolve, reject) => {
      zk.getChildren(path, async function (error, children) {
        if (error) {
          reject(error);
          return;
        }
  
        resolve(children || []);
      });
    });
  }

  async getData(registryConfig, path){
    const zk = await this.createConncetion(registryConfig);

    return new Promise((resolve, reject) => {
      zk.getData(path, async function (error, data) {
        if (error) {
          if(error.code !== -101){
            reject(error);
          }
          resolve(null);
          return;
        }
  
        resolve(data.toString("utf8"));
      });
    });
  }
}



export default new ZookeeperClientUtils();