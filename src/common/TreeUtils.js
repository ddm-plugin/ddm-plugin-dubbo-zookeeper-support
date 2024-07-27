import lodash from 'lodash';


class Node {

    constructor(nodeId, nodeLabel) {
        this.nodeId = nodeId;
        this.nodeLabel = nodeLabel;
        this.nodeChildrenMap = new Map();
        this.nodeChildren = [];
    }

    addNode(serviceInfo, packages, index = 0) {
        if (index >= packages.length) {
            return;
        }
    
        let pkg = packages[index];
        let node = this.nodeChildrenMap.get(pkg);
        if (!node) {
            node = (index === packages.length - 1) ? new Service(serviceInfo, pkg) : new Package(lodash.join(lodash.slice(packages, 0, index + 1), "."), pkg);
            this.nodeChildrenMap.set(pkg, node);
            this.nodeChildren.push(node);
        }
    
        node.addNode(serviceInfo, packages, index + 1);
    };
        

    // 合并只有一个子节点的包
    mergeOptimization() {
        for (let index = 0; index < this.nodeChildren.length; index++) {
            let subNode = this.nodeChildren[index];
    
            // 字节点没有子节点，那么不用合并了，它就是最底层了
            if (!subNode.isExistChild()) {
                continue;
            }
    
            subNode.mergeOptimization();
    
            delete this.nodeChildrenMap;

            // 如果只有一个子节点，并且它也是package，那么合并
            if (subNode.nodeChildren.length == 1 && subNode.nodeChildren[0].nodeType === "package") {
                const child = subNode.nodeChildren[0];
                child.nodeLabel = subNode.nodeLabel + "." + child.nodeLabel;
                this.nodeChildren[index] = child;
            }
        }
    }

    isExistChild() {
        return this.nodeChildren || this.nodeChildren.length == 0;
    }
}

class Package extends Node {
    constructor(pkg, pkgName) {
        super(pkg, pkgName);
        this.nodeType = "package";
    }
}

class Service extends Node {
    constructor(serviceInfo, pkg) {
        super(serviceInfo.serviceName, pkg);
        Object.assign(this, serviceInfo)
        this.nodeType = "service";
    }
}



class TreeUtils {
    createTree(serviceList, split) {

        let topNode = new Node("top");
        for (let i = 0; i < serviceList.length; i++) {
            let serviceInfo = serviceList[i];
    
            // 防止不存在
            if (!serviceInfo.serviceName) continue;
            
            let packages = serviceInfo.serviceName.split(split);
            if (!packages) continue;
    
            topNode.addNode(serviceInfo, packages);
        }

        topNode.mergeOptimization();
        return topNode.nodeChildren;
    }
    

}

export default new TreeUtils();