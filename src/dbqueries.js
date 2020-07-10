const neo4j = require('neo4j-driver')
const request = require('request')
var driver = neo4j.driver(process.env.NEO4J_URI, neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD), {encrypted: 'ENCRYPTION_ON'});




//https://members-api.parliament.uk/api/Posts/GovernmentPosts
//https://members-api.parliament.uk/api/Posts/GovernmentPosts
// https://members-api.parliament.uk/api/Reference/PolicyInterests
// setPolicyInterests()


// function DO_NOT_USE_setPolicyInterests(){
// 	runCypher({query: `MATCH (n:PolicyArea) DETACH DELETE n`}).then(() => {
// 		request('https://members-api.parliament.uk/api/Reference/PolicyInterests', (err, body, res) => {
// 			let policyAreas = JSON.parse(res)
// 			for (var i = 0; i < policyAreas.length; i++){
// 				let p = policyAreas[i]
// 				return runCypher({query: `CREATE (n:PolicyArea { name: '${p.description.replace(/[^\w\s]/gi, '')}', policyAreaId: '${p.id}'})` })
// 			.then(() => {
// 					console.log('success')
// 				}).catch((err) => {
// 					console.log(err)
// 				})
// 			}	
// 		})
// 	})
// }

function getAllDepartments(){



	request('https://members-api.parliament.uk/api/Reference/Departments', (err, body, res) => {
		let departments = JSON.parse(res)
		runCypher({query: `MATCH (n:Department) DETACH DELETE n`})
		.then(() => {
			// console.log(departments)
			Promise.all(departments.map((department )=> {
				return runCypher({query: `CREATE (n:Department { name: '${department.name.replace(/[^\w\s]/gi, '')}', imageUrl: '${department.imageUrl}', departmentId: '${department.id}'})` })
			}))
			.then(() => {
				console.log('success getting departments')
				assignPeopleToPosts()
			})
			.catch((err) => {
				console.log('error getting departments')
			})
		})
		.catch((err) => {
			console.log(err)
		})
	})
}

function assignPeopleToPosts(){
	const urls = ['https://members-api.parliament.uk/api/Posts/GovernmentPosts','https://members-api.parliament.uk/api/Posts/OppositionPosts']
	runCypher({query:`MATCH (n:Person)-[r:HOLDS_OFFICE]->() DELETE r`})
		.then(() => {
			for(var i = 0; i < urls.length; i++){
				request(urls[i], (err, body, res) => {
					let posts = JSON.parse(res)
					console.log(posts)
					Promise.all(posts.map((post) => {
						const role = post.value.hansardName || post.value.name
						const person = post.value.postHolders[0].member.value
						const departmentId = post.value.governmentDepartments[0].id
						// if (person && departmentId){
							return runCypher({query:`MATCH (n:Person{ personId:'${person.id}'}),(b:Department {departmentId: '${departmentId}'}) SET n.jobTitle = '${role.replace(/[^\w\s]/gi, '')}' CREATE (n)-[r:HOLDS_OFFICE]->(b) RETURN r`})
						// }
					}))
					.then(() => {
							console.log('success adding roles')
							// assignPeopleToPosts()
						})
						.catch((err) => {
							console.log('error adding roles')
						})

				})
			}	
		})
		.catch((err) => {
			console.log('err assigning posts', err)
		})
	
	
}



function getUnknownMembers(){
	runCypher({query: `MATCH (a) WHERE NOT (a)-[:MEMBER_OF]->() AND NOT a:Party AND NOT a:Department DETACH DELETE a`})
	.then((data)=> {
		console.log(data.records.length)
		data.records.map((item) => {
			// console.log(item.item)
			// console.log(item.name.length === 0)
		})
		// createPerson
	})
	.catch((err) => {

	})
}


//members functions 
function getAllMembers(){
	let skip = 440
	pull()
	function pull(){
		request(`https://members-api.parliament.uk/api/Members/Search?House=Commons&IsCurrentMember=true&skip=${skip}&take=20`, (err, body, res) => {
			let members = JSON.parse(res)
			Promise.all(members.items.map((member) => {
			    return addMember(member)
			  }))
			  .then((data) => {
			    if (skip < 630){
			    	console.log('skipping ', skip)
			    	skip += 20
			    	pull()
			    } else {
			    	console.log('WOHOOOO COMPLETE')
			    }
			  })
			  .catch(() => {
			    console.log('err')
			  })
		})
	}
}
const addMember = (member) => {
	return new Promise((resolve, reject) => {
		checkIfMemberExists(member.value.id)
			.then((output) =>{
				if (output){
					managePartyConnections(member)
					.then(()=> {
						resolve(member)
					})
					.catch((err) => {
						console.log(err)
						reject(err)
					})
				}
				else {
					createPerson(member).then(() => {
						managePartyConnections(member)
						.then(()=> {
							resolve(member)
						})
						.catch((err) => {
							console.log(err)
							reject(err)
						})
					})					
				}
				
			})
			.catch((err)=> {
				console.log('caught err', err)
			})
	})
}
function checkIfMemberExists(id){
	return new Promise((resolve, reject) => {
		runCypher({query: `MATCH(n:Person {personId:'${id}'}) RETURN n`})
			.then((results) => {
				if (results && results.records.length > 0){
					resolve(results)
				} else {
					resolve(false)
				}	
			})
			.catch((err) => {
				console.log('error in check', err)
				reject()
			})
	})
}
function createPerson(member){
	return new Promise((resolve, reject) => {
		runCypher({query: `CREATE (n:Person { name: '${member.value.nameDisplayAs.replace(/[^\w\s]/gi, '')}', party: '${member.value.latestParty.id}', image: '${member.value.thumbnailUrl}', personId: '${member.value.id}', constituency:'${member.value.latestHouseMembership.membershipFrom}' })`})
		.then(() => {
			addPartyConnection(member)
			.then(() => {
				resolve(member)
			})
			.catch((err) => {
				reject(err)
			})
		})
	})
}
function managePartyConnections(member){
	return new Promise((resolve, reject) => {
		runCypher({query: `MATCH (n:Person {personId:'${member.value.id}'})-[r:MEMBER_OF]->() DELETE r`})
		.then(() => {
			addPartyConnection(member)
			.then(() => {
				resolve(member)
			})
			.catch((err) => {
				reject(err)
			})
		})
	})
}
function addPartyConnection(member){
	return new Promise((resolve, reject) => {
		runCypher({query: `MATCH (a:Person),(b:Party) WHERE a.personId = '${member.value.id}' AND b.partyId = '${member.value.latestParty.id}' CREATE (a)-[r:MEMBER_OF]->(b) RETURN type(r)`})
		.then((data) => {
			resolve(member)
		})	
		.catch((err) => {
			reject(err)
		})
	})
}
//cypher
function runCypher({query}){
	const session = driver.session()
	return new Promise((resolve, reject) => {
		session
			.run(query)
			.then((results) => {
				resolve(results ? results : [])
				session.close()
			})
			.catch((err) => {
				console.log('err in cypher', err)
				reject()
				session.close()
			})		
	})
}
module.exports = {
	getAllMembers,
	getUnknownMembers,
	getAllDepartments,
	assignPeopleToPosts,
}


