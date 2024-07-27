import zookeeperClient from "node-zookeeper-client";

class ZookeeperClientUtils {
  createConncetion(dataSourceInfo) {
    let { address } = dataSourceInfo;
  
    const OPTIONS = {
      sessionTimeout: dataSourceInfo.sessionTimeout,
    };
  
    let zkClient = new Promise((resolve, reject) => {
        let zk = zookeeperClient.createClient(address, OPTIONS);
        zk.on("connected", function () {
          if(dataSourceInfo.scheme && dataSourceInfo.auth){
            zk.addAuthInfo(dataSourceInfo.scheme, Buffer.from(dataSourceInfo.auth));  
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

  async getChildren(dataSourceInfo, path){
    const zk = await this.createConncetion(dataSourceInfo);

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

  async getJsonData(dataSourceInfo, path){
    const data = await this.getData(dataSourceInfo, path);
    return data ? JSON.parse(data) : null;
  }

  async getData(dataSourceInfo, path){
    const zk = await this.createConncetion(dataSourceInfo);

    return new Promise((resolve, reject) => {
      zk.getData(path, async function (error, data) {
        if (error) {
          if(error.code !== -101){
            reject(error);
            return;
          }
          resolve(null);
          return;
        }
  
        resolve(data.toString("utf8"));
      });
    });
  }

  async setData(dataSourceInfo, path, data){
    const zk = await this.createConncetion(dataSourceInfo);
    return new Promise((resolve, reject) => {
      zk.setData(path, data, -1, (error) => {
        if(!error) {
          resolve();
          return;
        }

        // 不存在，创建一条
        if (error && error.code == -101) {
          zk.create(path, data, zookeeperClient.CreateMode.PERSISTENT, (error)  => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
          return;
        }
         
        reject(error);
      });
    });
  }


  async remove(dataSourceInfo, path){
    const zk = await this.createConncetion(dataSourceInfo);
    return new Promise((resolve, reject) => {
      zk.remove(path, -1, function(error) {
        // 不存在，忽略即可
        if (!error || (error && error.code == -101)) {
          resolve();
        }

        reject(error);
      });
    });
  }
}



export default new ZookeeperClientUtils();