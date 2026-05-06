/**
 * Allora REST client — used for freshness check against on-chain forecast.
 * On-chain reads from AlloraConsumer.getForecast are the source of truth;
 * the REST query is sanity-only.
 */

export interface AlloraForecast {
    topicId: string;
    valueE18: string;
    timestamp: number;
}

export async function fetchTopicForecast(_topicId: string): Promise<AlloraForecast | null> {
    // TODO(team): GET ${ALLORA_BASE_URL}/v1/topics/${topicId}/inferences
    //   parse latest inference, return as AlloraForecast.
    return null;
}
