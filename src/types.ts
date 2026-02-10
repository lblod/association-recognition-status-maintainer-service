export type DeltaBody = DeltaChangeset[];

export type DeltaChangeset = {
  inserts: DeltaStatement[];
  deletes: DeltaStatement[];
};

export type DeltaStatement = {
  subject: DeltaUri;
  predicate: DeltaUri;
  object: DeltaUri | DeltaLiteral;
  graph: DeltaUri;
};

export type DeltaUri = {
  type: "uri";
  value: string;
};

export type DeltaLiteral = {
  type: "literal";
  value: string;
};
