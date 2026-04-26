export async function addCustomDomainToRailway(domain: string) {
  const token = process.env.RAILWAY_API_TOKEN;
  const projectId = process.env.RAILWAY_PROJECT_ID;
  const environmentId = process.env.RAILWAY_ENVIRONMENT_ID;
  const serviceId = process.env.RAILWAY_SERVICE_ID;

  if (!token || !environmentId || !serviceId) {
    console.error("Railway credentials missing in .env");
    return false;
  }

  const query = `
    mutation customDomainCreate($environmentId: String!, $serviceId: String!, $domain: String!) {
      customDomainCreate(input: {
        environmentId: $environmentId,
        serviceId: $serviceId,
        domain: $domain
      }) {
        id
        domain
        status
      }
    }
  `;

  const variables = {
    environmentId,
    serviceId,
    domain,
  };

  try {
    const res = await fetch("https://backboard.railway.app/graphql/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    const result = await res.json();
    if (result.errors) {
      console.error("Railway API Error:", JSON.stringify(result.errors, null, 2));
      return false;
    }

    console.log("Railway Custom Domain Created:", result.data.customDomainCreate);
    return true;
  } catch (error) {
    console.error("Failed to add domain to Railway:", error);
    return false;
  }
}
