export default {
    connect: {

        zookeeper: {
            address: "链接地址",
            sessionTimeout: "超时时间",
            aclTips: "请输入认证信息, 例如：test:test"
        },

        nacos: {
            address: "链接地址",
            namespaceId: "命名空间ID",
            sessionTimeout: "超时时间",
            username: "用户名",
            password: "密码",
            groupName: '服务分组名称',
            groupNameTips: '请输入服务分组名称，默认为 DEFAULT_GROUP',
            group: '配置分组名称',
            groupTips: '请输入配置分组名称，默认为 dubbo',
        },

        dubboAdmin: {
            address: "链接地址",
            sessionTimeout: "超时时间",
            username: "用户名",
            password: "密码",
        }
    }
}