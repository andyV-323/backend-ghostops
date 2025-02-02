const axios = require("axios");
const querystring = require("querystring");

const CLIENT_ID = "6f6mo3220ct1sdu9dum08hdk96";
const REDIRECT_URI = "http://localhost:5173";
const CODE = "94581498-50a1-7056-5272-520425a3a612"; // Replace this with the code you got from frontend
const CODE_VERIFIER = "d_GtM6LGti01ydiXlMJXIUmPPEPi_G_SFj0xLbMPjLM"; // Replace with the same one used in frontend

async function exchangeToken() {
  try {
    const data = querystring.stringify({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code: CODE,
      code_verifier: CODE_VERIFIER,
    });

    const response = await axios.post(
      "https://us-east-1gmrbu64hs.auth.us-east-1.amazoncognito.com/oauth2/token",
      data,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    console.log("✅ Successfully Retrieved Token:", response.data);
  } catch (error) {
    console.error(
      "❌ Error:",
      error.response ? error.response.data : error.message
    );
  }
}

exchangeToken();

/*
"sub": "94581498-50a1-7056-5272-520425a3a612"


'eyJraWQiOiJyaHU5M0hvYWl6ZEQ1M2Vrc29FYXVqNjJoNGpcL2ZZU1NwVTBoaXdBTitDWT0iLCJhbGciOiJSUzI1NiJ9.eyJhdF9oYXNoIjoiSTQ1aFFDbmtYNGV2M0tzMWJ1RzhBdyIsInN1YiI6Ijk0NTgxNDk4LTUwYTEtNzA1Ni01MjcyLTUyMDQyNWEzYTYxMiIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV9HTXJCdTY0SHMiLCJjb2duaXRvOnVzZXJuYW1lIjoiYW5keXYiLCJvcmlnaW5fanRpIjoiZTY0NGY1NTQtZGY0MC00ZDY2LTgxOTctMDZkZDNiNzUyZTQ2IiwiYXVkIjoiNmY2bW8zMjIwY3Qxc2R1OWR1bTA4aGRrOTYiLCJldmVudF9pZCI6IjJjZGMxNDQ1LTJkNzUtNDcyZi1iMTM0LTIyMTU0MWM0ZDc1NiIsInRva2VuX3VzZSI6ImlkIiwiYXV0aF90aW1lIjoxNzM4Mzg1MTgxLCJleHAiOjE3MzgzODg3ODEsImlhdCI6MTczODM4NTE4MSwianRpIjoiZmYxNjlmOGItMjJhNS00OTYzLWFkNjMtY2Q3YWJmNTY5ZmRmIiwiZW1haWwiOiJhbmR5dmFsZW5jaWEuY3NAZ21haWwuY29tIn0.DpiZSGUy-aG5VpMfmGynGu1JBhpY68Anh6PFqoinKrk8oB8Pow2ND6qZrN6fBwsWrX__TeQmDXnQzXKmn9NdjplpWT1hwWGaCWjlHUAY2h8sMMT7pqrqfLvBF0_eHqaQxvHWquX4I7Zgvnua1RN8Iz4kgALkkhAEK_m1cXz02FVBaD0VH9Cor_rpXu_1lf6xnTdjH1PXu_CSgEvBC8UwKYbVUDpCTDboN5oszC8nF79Ir_qHtWF7zUeuuLogjfwikYBSfjfJTMegoYPWOkiXS_Sae6xfCG-Pe6VqnvMd52bnrxx9r5eFTZ2yYmRLzK_Si0yotSoeRzKpGnaGyk21fA'*/
