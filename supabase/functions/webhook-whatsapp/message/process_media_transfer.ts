import { FACEBOOK_API_VERSION } from "../index.ts";

export async function getFacebookMediaUrl(mediaId: string, facebookToken: string): Promise<string> {
    const response = await fetch(`https://graph.facebook.com/${FACEBOOK_API_VERSION}/${mediaId}`, {
        headers: {
            "Authorization": `Bearer ${facebookToken}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Error getting Facebook media URL (Media ID: ${mediaId}): ${response.statusText}`);
    }

    const data = await response.json();
    return data.url;
}

export async function downloadMedia(url: string, facebookToken: string): Promise<Blob> {
    const response = await fetch(url, {
        headers: {
            "Authorization": `Bearer ${facebookToken}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Error downloading media from Facebook (URL: ${url}): ${response.statusText}`);
    }

    return await response.blob();
}

export async function uploadMediaToSupabase(
    supabase: any,
    bucket: string,
    path: string,
    file: Blob,
    contentType: string
): Promise<string> {
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            contentType: contentType,
            upsert: true,
        });

    if (error) {
        throw new Error(`Error uploading to Supabase (Bucket: ${bucket}, Path: ${path}): ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

    return publicUrlData.publicUrl;
}
