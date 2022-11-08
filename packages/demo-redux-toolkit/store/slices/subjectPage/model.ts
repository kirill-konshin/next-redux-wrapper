interface SubjectPageData {
    id: string;
    name: string;
    stateTimestamp: number;
}

export interface SubjectPageState {
    data: SubjectPageData | null;
}
