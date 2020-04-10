export interface IPerStateTestReport {
    state: string,
    positive: number,
    negative: number,
    pending: number,
    grade: string,
    inIcuCurrently: number,
    inIcuCumulative: number,
    onVentilatorCurrently: number,
    onVentilatorCumulative: number,
    recovered: number,
    lastUpdate: string,
    death: number,
    hospitalized: number,
    totalTestResults: number
    dateModified: string,
    dateChecked: string
    sourceForState: string,
}

export interface IUsCasesTestingProgression {
    positive: number;
    negative: number;
    pending: number;
    hospitalizedCurrently: number;
    hospitalizedCumulative: number;
    inIcuCurrently: number;
    inIcuCumulative: number;
    onVentilatorCurrently: number;
    onVentilatorCumulative: number;
    recovered: number;
    hash: string;
    lastModified: string;
    death: number;
    hospitalized: number;
    total: number;
    totalTestResults: number;
    posNeg: number;
}