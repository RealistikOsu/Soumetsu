// The lazer tables only exist once their migrations have run, so cleanup that touches them skips them until then.
export const ifLazerTables = (query: Promise<unknown>) =>
  query.catch((error) => {
    if (!String(error).includes("doesn't exist")) throw error;
  });
