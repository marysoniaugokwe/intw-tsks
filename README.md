# intw-tsks
Steps to Finish these tasks

# Task 1. Create an image with python2, python3, R, install a set of requirements and upload it to docker hub.

Use the dockerfile which is in the repo and create the docker image and push it to docker hub for this requirement.
command used to create docker image is here

```
$ docker login -u your_dockerhub_username -p your_password  [ I used my username for dockerhub here]
$ docker build -t marysonia/devsecops_image .        
$ docker push marysonia/devsecops_image
```
# Note: Command to install docker in ec2 and provide permission to ec2-user.

```
$ yum update 
$ sudo yum install -y docker
$ sudo service docker start
$ sudo usermod -a -G docker ec2-user
```

# Task 2. For the previously created image
a. Share build times
b. How would you improve build times?

# To check build time of docker image 

```
time docker build -t marysonia/devsecops_image .

Ouput : 
[root@ip-172-31-16-139 ~]# time docker build -t marysonia/devsecops_image .
[+] Building 0.4s (11/11) FINISHED                                                                                                                                                                                                                               docker:default
 => [internal] load build definition from dockerfile                                                                                                                                                                                                              ..........

real    2m24.921s
user    0m0.895s
sys     0m0.379s
```

# Improvement Tips:
Use multi-stage builds.
Cache dependencies.
Minimize the number of layers in Dockerfile

# Task 3. Scan the recently created container and evaluate the CVEs that it might contain.
a. Create a report of your findings and follow best practices to remediate the CVE
b. What would you do to avoid deploying malicious packages?

# Sol. To create report I used "trivy"
```
$ trivy image marysonia/devsecops_image --format json --output trivy_report.json
```
Output of this run is in the repo with name "trivy_report.json"

# NOTE: Trivy Installation step in Ec2 Amazon linux 2
```
$ sudo yum install trivy
$ trivy --version
```
# point b. Avoid Malicious Packages:
Use trusted base images.
Regularly update dependencies.
Implement security scanning in CI/CD pipeline.


# Task 4 . Use the created image to create a kubernetes deployment with a command that will
keep the pod running

Output: deployment.yaml file is in repo , by using the deployment.yaml I deployed it and my pod is runnig.
```
[ec2-user@ip-172-31-16-139 intw-tsks]$ kubectl get po,deployment 
NAME                                        READY   STATUS    RESTARTS   AGE
pod/devsecops-deployment-857c5bf4d4-swl7f   1/1     Running   0          10h

NAME                                   READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/devsecops-deployment   1/1     1            1           10h
```

# Task 5. Expose the deployed resource

Output: service.yaml file is in repo , which is used to expose the deployed resource.
```
[ec2-user@ip-172-31-16-139 intw-tsks]$ kubectl get svc
NAME                TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)   AGE
devsecops-service   ClusterIP   10.100.194.135   <none>        80/TCP    10h
```

# Task 6. Every step mentioned above have to be in a code repository with automated CI/CD

Output: workflow.yaml file is avialable in repo under folder .github/workflow , this is used to automate all the above steps

# Task 7. How would you monitor the above deployment? Explain or implement the tools that you would use

Output: I am using prometheus and grafana to monitor all the deployed resources and eks cluster also. 

prometheus.yaml , grafana.yaml files are the values file which i used during my deployment , I used the below helm command to deploy 
both prometheus and grafana. Since helm was not there, I installed helm also in my server

```
$ curl https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 | bash
$  helm
$ helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
$ helm repo add grafana https://grafana.github.io/helm-charts
$ helm repo update
$ helm ls
$ kubectl create namespace monitoring
$ helm install prometheus prometheus-community/prometheus --namespace monitoring -f prometheus.yaml
$ helm install grafana grafana/grafana --namespace monitoring -f grafana.yaml
```
For alerting, I updated the config in values file of prometheus and created one alerting-rules.yaml file. which is already there in repo.

# Note:
Once you deploy prometheus to your eks cluster it will go into pending state , this is due to the csi driver, by default, is not running in the cluster. Need to run csi driver which required some IAM permmissions , so adding the permission and command here to run csi driver for ebs.

Follow the below commands to run csi driver and re-deploy prometheus
```
$ helm repo add aws-ebs-csi-driver https://kubernetes-sigs.github.io/aws-ebs-csi-driver
$ helm repo update
$ helm install aws-ebs-csi-driver aws-ebs-csi-driver/aws-ebs-csi-driver --namespace kube-system
$ cat <<EoF > ebs-csi-policy.json
  {
  "Version": "2012-10-17",
   "Statement": [
     {
       "Effect": "Allow",
       "Action": [
         "ec2:CreateSnapshot",
         "ec2:AttachVolume",
        "ec2:DetachVolume",
         "ec2:ModifyVolume",
         "ec2:DescribeAvailabilityZones",
        "ec2:DescribeInstances",
          "ec2:DescribeSnapshots",
         "ec2:DescribeTags",
         "ec2:DescribeVolumes",
         "ec2:DescribeVolumesModifications",
          "ec2:CreateTags",
          "ec2:DeleteTags",
          "ec2:CreateVolume",
         "ec2:DeleteVolume"
       ],
       "Resource": "*"
     }
   ]
  }
  EoF
```
```
$ aws iam create-policy --policy-name AmazonEKS_EBS_CSI_Driver_Policy --policy-document file://ebs-csi-policy.json
$ eksctl create iamserviceaccount   --name ebs-csi-controller-sa   --namespace kube-system   --cluster eks-cluster   --attach-policy-arn arn:aws:iam::211125544752:policy/AmazonEKS_EBS_CSI_Driver_Policy   --approve   --role-only   --role-name AmazonEKS_EBS_CSI_DriverRole
$ eksctl utils associate-iam-oidc-provider --cluster=eks-cluster --region us-east-1 --approve
$ eksctl create iamserviceaccount   --name ebs-csi-controller-sa   --namespace kube-system   --cluster eks-cluster   --attach-policy-arn arn:aws:iam::211125544752:policy/AmazonEKS_EBS_CSI_Driver_Policy   --approve   --role-only   --role-name AmazonEKS_EBS_CSI_DriverRole 
$ kubectl annotate serviceaccount ebs-csi-controller-sa -n kube-system eks.amazonaws.com/role-arn=arn:aws:iam::211125544752:role/AmazonEKS_EBS_CSI_DriverRole
$ kubectl get pods -n kube-system -l app=ebs-csi-controller
$ aws iam attach-role-policy --role-name eksctl-eks-cluster-nodegroup-ng-1-NodeInstanceRole-TYzVS2hb6WrJ --policy-arn arn:aws:iam::211125544752:policy/AmazonEKS_EBS_CSI_Driver_Policy
$ aws iam list-attached-role-policies --role-name eksctl-eks-cluster-nodegroup-ng-1-NodeInstanceRole-TYzVS2hb6WrJ
$ helm upgrade prometheus prometheus-community/prometheus --namespace monitoring -f prometheus.yaml
$ helm upgrade grafana grafana/grafana --namespace monitoring -f grafana.yaml
$ kubectl get pods -n monitoring
$ kubectl get pvc -n monitoring
$ kubectl get pods -n monitoring -owide
```

# Project Section 

# Task . UI, CI/CD, workflow or other tool that will allow people to select options for:
a. Base image
b. Packages
c. Mem/CPU/GPU requests

# Sol. Code is in github repo.

# Task 2. 
Monitor each environment and make sure that:
a. Resources request is accurate (requested vs used)
b. Notify when resources are idle or underutilized
c. Downscale when needed (you can assume any rule defined by you to allow this
to happen)
d. Save data to track people requests/usage and evaluate performance

Sol. 
For these tasks, first need to install kube-metrics which I used to install using below command.
```
$ helm install kube-state-metrics prometheus-community/kube-state-metrics --namespace monitoring 
```
Then I wrote two promethues query for getting data of CPU and Memory , attaching the query here. By using this query I created grafana dashboard. 

# Query used : 

# CPU Requests vs. Usage:
```
sum(kube_pod_container_resource_requests_cpu_cores) by (namespace, pod, container)
sum(rate(container_cpu_usage_seconds_total{container!="POD",container!=""}[5m])) by (namespace, pod, container)
```
# Memory Requests vs. Usage:
```
sum(kube_pod_container_resource_requests_memory_bytes) by (namespace, pod, container)
sum(container_memory_usage_bytes{container!="POD",container!=""}) by (namespace, pod, container)
```

# Task 3. The cluster needs to automatically handle up/down scaling and have multiple instance groups/taints/tags/others to be chosen from in order to segregate resources usage between teams/resources/projects/others

Sol. To complete this task I deployed autoscaler

Commands are below. 
```
$ helm repo add autoscaler https://kubernetes.github.io/autoscaler
$ helm repo update
$ helm install cluster-autoscaler autoscaler/cluster-autoscaler --namespace kube-system \
    --set cloudProvider=aws \
    --set awsRegion=us-east-1\
    --set autoDiscovery.clusterName=eks-cluster \
    --set awsAccessKeyID=your-access-key-id \
    --set awsSecretAccessKey=your-secret-access-key
```
Since it not working due to missing permission , I added policy in role which is attached in node. and updated the values file for autoscaler "eks/autoscaler.yaml" it's in repo.
```
$ helm upgrade --install cluster-autoscaler autoscaler/cluster-autoscaler --namespace kube-system -f values.yaml
```
Sharing steps to create role and attach policy in it. 

Policy doocument is here. 
```
"cluster-autoscaler-policy.json"

{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateLaunchTemplate",
        "ec2:CreateLaunchTemplateVersion",
        "ec2:DeleteLaunchTemplate",
        "ec2:DeleteLaunchTemplateVersions",
        "ec2:DescribeLaunchTemplates",
        "ec2:DescribeLaunchTemplateVersions",
        "ec2:RunInstances",
        "ec2:CreateTags",
        "ec2:DescribeInstances",
        "ec2:DescribeTags",
        "ec2:TerminateInstances",
        "autoscaling:DescribeAutoScalingGroups",
        "autoscaling:UpdateAutoScalingGroup",
        "autoscaling:DescribeAutoScalingInstances",
        "autoscaling:DescribeLaunchConfigurations",
        "autoscaling:DescribeTags",
        "autoscaling:SetDesiredCapacity",
        "autoscaling:TerminateInstanceInAutoScalingGroup"
      ],
      "Resource": "*"
    }
  ]
}
```
```
$ aws iam create-policy --policy-name AmazonEKSClusterAutoscalerPolicy --policy-document file://cluster-autoscaler-policy.json
```
# trust-policy.json
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```
```
$ aws iam create-role --role-name EKSClusterAutoscalerRole --assume-role-policy-document file://trust-policy.
$ aws iam attach-role-policy --role-name EKSClusterAutoscalerRole --policy-arn arn:aws:iam::<your-account-id>:policy/AmazonEKSClusterAutoscalerPolicy
```

# Task 4. 

SFTP, SSH or similar access to the deployed environment is needed so DNS handling automation is required

Solution: Create ssh-key for SFTP/SSH setup , and deployment & service creating command are here and files are in repo. 
```
$ ssh-keygen -t rsa -b 2048 -f ~/.ssh/id_rsa -N ""
$ kubectl create secret generic ssh-keys --from-file=ssh-privatekey=~/.ssh/id_rsa --from-file=ssh-publickey=~/.ssh/id_rsa.pub -n monitor
```
# Task DNS Handling Automation

For DNS Handling I deployed external dns service using helm.
```
$ helm repo add bitnami https://charts.bitnami.com/bitnami
$ helm install externaldns bitnami/external-dns --namespace kube-system --set provider=aws --set aws.zoneType=public --set txtOwnerId=your-cluster-name
```

# Task 5. 
Some processes that are going to run inside these environments require between 100-250GB of data in memory
a. Could you talk about a time when you needed to bring the data to the code, and how you architected this system?
b. If you don’t have an example, could you talk through how you would go about architecting this?
c. How would you monitor memory usage/errors?

Sol. 

Architecting the System to Bring Data to Code

# Distributed Storage:

1. I will use Amazon S3 for storing large datasets.
2. Also I will use EFS for shared storage if necessary.

# For Data Ingestion:

I will use AWS Data Pipeline or similar services to move data from S3 to EFS or directly into the pods.

# Kubernetes Persistent Volumes:

I will use Kubernetes PersistentVolumeClaims (PVCs) to provide storage to pods.

PV and PVC code 
```
apiVersion: v1
kind: PersistentVolume
metadata:
  name: large-data-pv
spec:
  capacity:
    storage: 500Gi
  accessModes:
    - ReadWriteOnce
  awsElasticBlockStore:
    volumeID: xxxx
    fsType: ext4
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: large-data-pvc
  namespace: application
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 500Gi
```

# Monitoring Memory Usage and Errors

For monitoring the state of Memory utilization, I will follow the steps below

Prometheus Metrics:

Set up Prometheus to scrape memory usage metrics.
Use kube-state-metrics to collect Kubernetes object states.
Grafana Dashboards:

Create Grafana dashboards to visualize memory usage.
Set up alerts for high memory usage.

# For Handling Large Data Processes

Data Processing Architecture:

Use distributed data processing frameworks like Apache Spark or Dask.
Deploy these frameworks on Kubernetes using Helm charts.
