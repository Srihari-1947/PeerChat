let APP_ID="aa2b80fd5bc542b8b23b9b4d7bf327cf"
let token=null;

let uid=String(Math.floor(Math.random()*10000))
let localstream;
let remotestream;
let peerconnection;



const servers = {
    iceserververs:[
        {
            urls:['stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302']
        }
    ]
}
let init= async() => 
    {
        client = await AgoraRTM.createInstance(APP_ID)
        await client.login({uid,token})

        channel = client.createChannel('main')
        await channel.join()

        channel.on('MemberJoined',handleUserJoined)

        channel.on('MemberLeft',handleUserLeft)
        
        client.on('MessageFromPeer',handleMessageFromPeer)

        localstream= await navigator.mediaDevices.getUserMedia({video:true,audio:true})
        document.getElementById("user-1").srcObject= localstream
       
    } 
let handleUserLeft = async (memberId) =>
    {
        document.getElementById('user-2').style.display='none'
    }
let handleMessageFromPeer = async (message,memberId) => {
    message=JSON.parse(message.text)
    if(message.type == "offer")
    {
        createanswer(memberId,message.offer)
    }

    if(message.type == 'answer')
    {
        addanswer(message.answer)
    }

    if(message.type == "candidate")
    {
        if(peerconnection)
        {
            peerconnection.addIceCandidate(message.candidate)
        }
    }
}


let handleUserJoined = async (memberId) => {
    console.log("A new user joined the channel",memberId)
    createoffer(memberId)
}


let createPeerConnection = async (memberId) => 
    {
        peerconnection=new RTCPeerConnection(servers) 

        remotestream= new MediaStream()
        document.getElementById('user-2').srcObject= remotestream
        document.getElementById('user-2').style.display = 'block'

        if(!localstream){
            localstream= await navigator.mediaDevices.getUserMedia({video:true,audio:false})
            document.getElementById("user-1").srcObject= localstream
        }
        localstream.getTracks().forEach((track) => {
            peerconnection.addTrack(track,localstream)
        })

        peerconnection.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {remotestream.addTrack(track)})
        }

        peerconnection.onicecandidate = async (event) => {
            if(event.candidate){
                console.log("New ICE candidate: ", event.candidate)
                client.sendMessageToPeer({text:JSON.stringify({"type":"candidate","candidate":event.candidate})},memberId)
            }
        }

    }


let createoffer = async(memberId) =>
    {
        await createPeerConnection(memberId)

        let offer = await peerconnection.createOffer() 
        await peerconnection.setLocalDescription(offer)


        console.log("offer",offer)
        client.sendMessageToPeer({text:JSON.stringify({"type":"offer","offer":offer})},memberId)

    } 
    
let createanswer = async(memberId,offer) =>
    {
        await createPeerConnection(memberId)
        await peerconnection.setRemoteDescription(offer)

        let answer = await peerconnection.createAnswer()
        await peerconnection.setLocalDescription(answer)

        console.log("asnswer",answer)
        client.sendMessageToPeer({text:JSON.stringify({"type":"answer","answer":answer})},memberId)

    }

let addanswer =async (answer) => {
    if(!peerconnection.cuurentRemoteDescription)
    {
       peerconnection.setRemoteDescription(answer)
    }
}

let leaveChannel = async () => {
    await channel.leave()
    await client.logout()
}

window.addEventListener("beforeunload",leaveChannel)


init()
